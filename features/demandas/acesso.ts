import 'server-only';
import { redirect } from 'next/navigation';
import { db, type Db } from '@/lib/db';
import { ErroDominio } from '@/lib/errors';
import type { UsuarioSessao } from '@/lib/session';
import { demandaNaFila } from './consultas';

/**
 * Quem pode ver uma Demanda (detalhe, arquivos, entregas, comentários, histórico, ficha).
 * Fonte única da regra: páginas, Server Actions e, adiante, a agenda em calendário e o perfil Cliente
 * chamam estas funções. Regra nova = um item novo em REGRAS_ACESSO_DEMANDA, sem mexer nos chamadores.
 */

export const MENSAGEM_SEM_ACESSO_DEMANDA = 'Você não tem permissão para esta Demanda.';
export const MENSAGEM_DEMANDA_NAO_ENCONTRADA = 'Demanda não encontrada.';
export const DESTINO_SEM_ACESSO_DEMANDA = '/demandas?aviso=sem-permissao';

/** Campos da Demanda que as regras de acesso podem consultar. */
export type DemandaParaAcesso = {
  id: string;
  editor_id: string | null;
  influencer_id: string | null;
  format: string;
};

export type ContextoAcessoDemanda = {
  sql: Db;
  usuario: UsuarioSessao;
  demanda: DemandaParaAcesso;
};

export type RegraAcessoDemanda = {
  nome: string;
  permite: (contexto: ContextoAcessoDemanda) => boolean | Promise<boolean>;
};

export const REGRAS_ACESSO_DEMANDA: readonly RegraAcessoDemanda[] = [
  { nome: 'administrador', permite: ({ usuario }) => usuario.perfil === 'Administrador' },
  { nome: 'ver-todas-demandas', permite: ({ usuario }) => usuario.permissoes.verTodasDemandas },
  {
    nome: 'editor-responsavel',
    permite: ({ usuario, demanda }) => demanda.editor_id !== null && demanda.editor_id === usuario.id,
  },
  {
    nome: 'influencer-solicitante',
    permite: ({ usuario, demanda }) => demanda.influencer_id !== null && demanda.influencer_id === usuario.id,
  },
  {
    nome: 'aprovador-delegado',
    permite: async ({ sql, usuario, demanda }) => {
      if (!demanda.editor_id) return false;
      const [delegacao] = await sql<{ ok: number }[]>`
        SELECT 1 AS ok FROM approval_delegations
        WHERE approver_id = ${usuario.id} AND editor_id = ${demanda.editor_id}`;
      return Boolean(delegacao);
    },
  },
  {
    nome: 'editor-da-fila',
    permite: ({ usuario, demanda }) => usuario.perfil === 'Editor' && demandaNaFila(demanda),
  },
];

export type ResultadoAcessoDemanda = { permitido: true; regra: string } | { permitido: false };

/** Avalia as regras em ordem e para na primeira que permite. */
export async function avaliarAcessoDemanda(
  sql: Db,
  usuario: UsuarioSessao,
  demanda: DemandaParaAcesso,
): Promise<ResultadoAcessoDemanda> {
  for (const regra of REGRAS_ACESSO_DEMANDA) {
    if (await regra.permite({ sql, usuario, demanda })) return { permitido: true, regra: regra.nome };
  }
  return { permitido: false };
}

/** Lê só os campos de acesso; vale também para Demanda na Lixeira (quem decide o destino é o chamador). */
export async function carregarDemandaParaAcesso(sql: Db, id: string): Promise<DemandaParaAcesso | null> {
  const [linha] = await sql<DemandaParaAcesso[]>`
    SELECT id, editor_id, influencer_id, format FROM demands WHERE id = ${id}`;
  return linha ?? null;
}

/** Verdadeiro se o Usuário pode ver a Demanda (por id ou com os campos já carregados). */
export async function podeVerDemanda(
  sql: Db,
  usuario: UsuarioSessao,
  demanda: string | DemandaParaAcesso,
): Promise<boolean> {
  const alvo = typeof demanda === 'string' ? await carregarDemandaParaAcesso(sql, demanda) : demanda;
  if (!alvo) return false;
  return (await avaliarAcessoDemanda(sql, usuario, alvo)).permitido;
}

/** Para Server Actions: lança ErroDominio (a transação é desfeita) se não existir ou não puder ver. */
export async function garantirAcessoDemanda(sql: Db, usuario: UsuarioSessao, demandaId: string): Promise<void> {
  const alvo = await carregarDemandaParaAcesso(sql, demandaId);
  if (!alvo) throw new ErroDominio(MENSAGEM_DEMANDA_NAO_ENCONTRADA);
  if (!(await avaliarAcessoDemanda(sql, usuario, alvo)).permitido) throw new ErroDominio(MENSAGEM_SEM_ACESSO_DEMANDA);
}

/** Para páginas: sem acesso, volta a /demandas com o aviso de permissão (padrão do app). */
export async function exigirAcessoDemanda(usuario: UsuarioSessao, demanda: DemandaParaAcesso): Promise<void> {
  if (!(await podeVerDemanda(db(), usuario, demanda))) redirect(DESTINO_SEM_ACESSO_DEMANDA);
}
