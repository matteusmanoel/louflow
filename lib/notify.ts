import 'server-only';
import type { Sql } from './db';
import { enviarNotificacao } from '@/features/notificacoes/enviador';
import { registrarErro } from './error-log';

/**
 * Interface de notificação. As fatias só enfileiram notificações dentro da Server Action;
 * o envio acontece depois do commit. O adaptador real (Resend) é implementado por S1-08
 * em features/notificacoes/enviador.ts, sem mudar esta assinatura.
 */

export type TipoNotificacao =
  | 'editor_atribuido'
  | 'status_alterado'
  | 'novo_comentario'
  | 'ajuste_solicitado'
  | 'concluida_aprovada'
  | 'prazo_proximo'
  | 'pendencia_influencer'
  | 'aviso_administracao';

export type Notificacao = {
  tipo: TipoNotificacao;
  /** Usuários destinatários; o adaptador resolve e-mail e preferências. */
  destinatarios: string[];
  assunto: string;
  texto: string;
  demandaId?: string;
};

export type Enviador = (sql: Sql, n: Notificacao) => Promise<void>;

let enviador: Enviador = enviarNotificacao;

/** Substitui o adaptador (testes). `null` restaura o padrão. */
export function registrarEnviador(novo: Enviador | null) {
  enviador = novo ?? enviarNotificacao;
}

/** Envia após o commit. Falhas são registradas e nunca propagadas. */
export async function despacharNotificacoes(sql: Sql, fila: readonly Notificacao[]): Promise<void> {
  for (const n of fila) {
    try {
      await enviador(sql, n);
    } catch (erro) {
      await registrarErro(sql, 'servidor:notificacao', erro, `tipo=${n.tipo}`);
    }
  }
}
