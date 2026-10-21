import 'server-only';
import type { z } from 'zod';
import { db, type Sql, type Tx } from './db';
import { ErroDominio, infoErroBanco } from './errors';
import { registrarErro } from './error-log';
import { despacharNotificacoes, type Notificacao } from './notify';
import type { ChavePermissao } from './permissions';
import type { UsuarioSessao } from './session';

/**
 * Contrato de toda Server Action, em ordem fixa:
 * Sessão → validação → Permissão → transação → domínio (+ Histórico/Auditoria) → commit → notificações.
 * Retorna sempre { ok, mensagem, dados }.
 */

export type Resultado<T> = { ok: true; mensagem: string; dados: T } | { ok: false; mensagem: string; dados?: undefined };

export type ContextoAcao<E> = {
  tx: Tx;
  usuario: UsuarioSessao;
  entrada: E;
  /** Enfileira notificação para envio após o commit. */
  notificar: (n: Notificacao) => void;
};

export type DefinicaoAcao<S extends z.ZodType, T> = {
  nome: string;
  schema: S;
  /** Chave exigida ou predicado sobre o Usuário. Omitir = só Sessão. */
  permissao?: ChavePermissao | ((u: UsuarioSessao) => boolean);
  /** Permite executar com PIN provisório (só a troca de PIN). */
  permitirPinProvisorio?: boolean;
  /** Mensagens amigáveis por nome de restrição do banco (ex.: EXCLUDE de sobreposição). */
  restricoes?: Record<string, string>;
  executar: (ctx: ContextoAcao<z.infer<S>>) => Promise<{ dados: T; mensagem?: string }>;
};

export type Dependencias = {
  obterUsuario: () => Promise<UsuarioSessao | null>;
  sql: () => Sql;
};

export const MENSAGEM_SEM_SESSAO = 'Sua sessão expirou. Entre novamente.';
export const MENSAGEM_SEM_PERMISSAO = 'Você não tem permissão para esta ação.';
export const MENSAGEM_ERRO_INESPERADO = 'Não foi possível concluir a ação. Tente novamente.';

function temPermissao(u: UsuarioSessao, regra: DefinicaoAcao<z.ZodType, unknown>['permissao']): boolean {
  if (!regra) return true;
  return typeof regra === 'function' ? regra(u) : u.permissoes[regra];
}

export async function executarAcao<S extends z.ZodType, T>(
  def: DefinicaoAcao<S, T>,
  bruto: unknown,
  deps: Dependencias,
): Promise<Resultado<T>> {
  const usuario = await deps.obterUsuario();
  if (!usuario) return { ok: false, mensagem: MENSAGEM_SEM_SESSAO };
  if (usuario.deveTrocarPin && !def.permitirPinProvisorio) {
    return { ok: false, mensagem: 'Defina seu novo PIN antes de continuar.' };
  }

  const validado = def.schema.safeParse(bruto);
  if (!validado.success) {
    const primeiro = validado.error.issues[0];
    return { ok: false, mensagem: primeiro?.message ?? 'Dados inválidos.' };
  }

  if (!temPermissao(usuario, def.permissao)) return { ok: false, mensagem: MENSAGEM_SEM_PERMISSAO };

  const sql = deps.sql();
  const fila: Notificacao[] = [];
  try {
    const { dados, mensagem } = await sql.begin((tx) =>
      def.executar({ tx, usuario, entrada: validado.data, notificar: (n) => fila.push(n) }),
    );
    await despacharNotificacoes(sql, fila);
    return { ok: true, mensagem: mensagem ?? 'Pronto.', dados: dados as T };
  } catch (erro) {
    if (erro instanceof ErroDominio) return { ok: false, mensagem: erro.message };
    const { restricao } = infoErroBanco(erro);
    if (restricao && def.restricoes?.[restricao]) return { ok: false, mensagem: def.restricoes[restricao] };
    await registrarErro(sql, `servidor:${def.nome}`, erro);
    return { ok: false, mensagem: MENSAGEM_ERRO_INESPERADO };
  }
}

/** Cria a Server Action. Use dentro de um arquivo com 'use server'. */
export function criarAcao<S extends z.ZodType, T>(def: DefinicaoAcao<S, T>) {
  return async (entrada: unknown): Promise<Resultado<T>> => {
    const { obterSessao } = await import('./auth');
    return executarAcao(def, entrada, { obterUsuario: obterSessao, sql: db });
  };
}
