import type { Enviador } from '@/lib/notify';
import type { TipoNotificacao } from '@/lib/notify';
import type { Sql } from '@/lib/db';

/**
 * S1-08 (#11563): adaptador de envio de notificações.
 * Consulta notification_preferences do destinatário antes de enviar.
 * Sem RESEND_API_KEY, registra o payload via console (stub MVP).
 * Com RESEND_API_KEY, envia via API REST do Resend (sem dependência extra).
 * Falhas lançadas aqui são capturadas por lib/notify e registradas; nunca desfazem a operação.
 */

const COLUNA: Partial<Record<TipoNotificacao, string>> = {
  editor_atribuido: 'editor_assigned',
  status_alterado: 'status_changed',
  novo_comentario: 'new_comment',
  ajuste_solicitado: 'adjustment_request',
  concluida_aprovada: 'completed_approved',
  prazo_proximo: 'deadline_near',
};

async function resolverDestinatarios(sql: Sql, ids: string[], tipo: TipoNotificacao): Promise<string[]> {
  if (ids.length === 0) return [];

  const coluna = COLUNA[tipo];

  // Busca email + preferência do destinatário num único JOIN
  const rows = await sql<{ email: string; habilitado: boolean | null }[]>`
    SELECT u.email,
           np.${coluna ? sql(coluna) : sql`NULL`} AS habilitado
    FROM   users u
    LEFT JOIN notification_preferences np ON np.user_id = u.id
    WHERE  u.id = ANY(${sql.array(ids)}::uuid[])
      AND  u.is_active = true
  `;

  return rows
    .filter((r) => {
      // Sem coluna mapeada (tipos internos: pendencia_influencer, aviso_administracao) = sempre envia
      if (!coluna) return true;
      // Sem linha = padrão true (DEFAULT true no schema)
      return r.habilitado !== false;
    })
    .map((r) => r.email);
}

async function enviarViaResend(emails: string[], assunto: string, texto: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const from = process.env.RESEND_FROM ?? 'LouFlow <noreply@loumarturismo.com.br>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: emails, subject: assunto, text: texto }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

export const enviarNotificacao: Enviador = async (sql, n) => {
  const emails = await resolverDestinatarios(sql, n.destinatarios, n.tipo);
  if (emails.length === 0) return;

  if (process.env.RESEND_API_KEY) {
    await enviarViaResend(emails, n.assunto, n.texto);
  } else {
    // MVP stub: imprime no console (nunca em produção com segredos)
    console.log('[notificacao]', {
      tipo: n.tipo,
      destinatarios: emails,
      assunto: n.assunto,
      texto: n.texto,
      demandaId: n.demandaId,
    });
  }
};
