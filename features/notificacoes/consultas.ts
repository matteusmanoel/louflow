import 'server-only';
import { db, type Db } from '@/lib/db';

export type PreferenciasNotificacao = {
  editor_atribuido: boolean;
  status_alterado: boolean;
  novo_comentario: boolean;
  ajuste_solicitado: boolean;
  concluida_aprovada: boolean;
  prazo_proximo: boolean;
};

/** Retorna as preferências de notificação do usuário. Se não houver linha, devolve os padrões (tudo true). */
export async function listarPreferencias(sqlOuUsuarioId: Db | string, usuarioId?: string): Promise<PreferenciasNotificacao> {
  // Suporta dois modos de chamada:
  //   listarPreferencias(sql, usuarioId)  — testes (com Db explícito)
  //   listarPreferencias(usuarioId)       — páginas (usa db() internamente)
  const sql: Db = typeof sqlOuUsuarioId === 'string' ? db() : sqlOuUsuarioId;
  const id: string = typeof sqlOuUsuarioId === 'string' ? sqlOuUsuarioId : usuarioId!;
  return _listarPreferencias(sql, id);
}

async function _listarPreferencias(sql: Db, usuarioId: string): Promise<PreferenciasNotificacao> {
  const [row] = await sql<{
    editor_assigned: boolean;
    status_changed: boolean;
    new_comment: boolean;
    adjustment_request: boolean;
    completed_approved: boolean;
    deadline_near: boolean;
  }[]>`
    SELECT editor_assigned, status_changed, new_comment,
           adjustment_request, completed_approved, deadline_near
    FROM   notification_preferences
    WHERE  user_id = ${usuarioId}
  `;

  if (!row) {
    return {
      editor_atribuido: true,
      status_alterado: true,
      novo_comentario: true,
      ajuste_solicitado: true,
      concluida_aprovada: true,
      prazo_proximo: true,
    };
  }

  return {
    editor_atribuido: row.editor_assigned,
    status_alterado: row.status_changed,
    novo_comentario: row.new_comment,
    ajuste_solicitado: row.adjustment_request,
    concluida_aprovada: row.completed_approved,
    prazo_proximo: row.deadline_near,
  };
}
