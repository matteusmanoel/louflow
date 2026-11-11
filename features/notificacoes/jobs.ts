import type { HandlerJob } from '@/lib/cron';
import type { Db } from '@/lib/db';
import { enviarNotificacao } from './enviador';
import { lerCadencia } from './consultas';
import { lerCanal } from './canal';
import { textoPendencia, textoPrazo } from './mensagens';
import { formatarDia, relogioSaoPaulo, somarDias } from './relogio';

type ItemPrazo = { titulo: string; prazo: string; editorId: string | null };
type ItemPendencia = { chave: string; titulo: string; influencerId: string | null };

/** Alerta de prazo no horário configurado. Um resumo por dia. */
export const enviarAlertasPrazo: HandlerJob = async ({ sql, agora }) => {
  const cadencia = await lerCadencia(sql);
  const relogio = relogioSaoPaulo(agora);
  if (relogio.hora !== cadencia.horaPrazo) return { afetados: 0 };
  if (!lerCanal().pronto) return { afetados: 0 };

  const limite = somarDias(relogio.dia, cadencia.antecedenciaDias);
  const linhas = await sql<{ title: string; prazo: string; editor_id: string | null }[]>`
    SELECT d.title,
           COALESCE(d.post_date, d.approval_date)::text AS prazo,
           d.editor_id
    FROM   demands d
    WHERE  d.deleted_at IS NULL
      AND  d.status NOT IN ('Concluída', 'Reprovada', 'Cancelada')
      AND  COALESCE(d.post_date, d.approval_date) BETWEEN ${relogio.dia}::date AND ${limite}::date
    ORDER BY prazo, d.title
  `;
  if (linhas.length === 0) return { afetados: 0 };

  const chave = relogio.dia;
  if (!(await reivindicar(sql, 'prazo_proximo', chave, null))) return { afetados: 0 };

  const itens: ItemPrazo[] = linhas.map((linha) => ({
    titulo: linha.title,
    prazo: formatarDia(linha.prazo),
    editorId: linha.editor_id,
  }));
  try {
    await enviarNotificacao(sql, {
      tipo: 'prazo_proximo',
      destinatarios: [...new Set(itens.flatMap((item) => (item.editorId ? [item.editorId] : [])))],
      assunto: 'Prazos próximos',
      texto: textoPrazo(cadencia.antecedenciaDias, itens),
    });
  } catch (erro) {
    await sql`DELETE FROM notification_dispatches WHERE kind = 'prazo_proximo' AND subject_key = ${chave}`;
    throw erro;
  }
  return { afetados: itens.length };
};

/**
 * Pendências do influencer paradas além da folga, só no horário configurado.
 * O cron de 15 min é o relógio; esta função decide se o aviso sai.
 */
export const avisarPendenciasInfluencer: HandlerJob = async ({ sql, agora }) => {
  const cadencia = await lerCadencia(sql);
  const relogio = relogioSaoPaulo(agora);
  if (relogio.hora !== cadencia.horaPendencia) return { afetados: 0 };
  if (!lerCanal().pronto) return { afetados: 0 };

  const aprovacoes = await sql<{ chave: string; title: string; influencer_id: string | null }[]>`
    SELECT 'aprovacao:' || d.id AS chave, d.title, d.influencer_id
    FROM   demands d
    LEFT JOIN LATERAL (
      SELECT created_at FROM history
      WHERE  demand_id = d.id AND action = 'status:Aprovação'
      ORDER BY created_at DESC
      LIMIT 1
    ) h ON true
    WHERE  d.deleted_at IS NULL
      AND  d.status = 'Aprovação'
      AND  COALESCE(h.created_at, d.updated_at) <= now() - (${cadencia.folgaHoras}::int * interval '1 hour')
  `;
  const agendamentos = await sql<{ chave: string; title: string; influencer_id: string | null }[]>`
    SELECT 'agendamento:' || id AS chave, title, influencer_id
    FROM   mandatory_schedules
    WHERE  status = 'Pendente'
      AND  created_at <= now() - (${cadencia.folgaHoras}::int * interval '1 hour')
  `;

  const candidatos: ItemPendencia[] = [...aprovacoes, ...agendamentos].map((linha) => ({
    chave: linha.chave,
    titulo: linha.title,
    influencerId: linha.influencer_id,
  }));
  const aceitos: ItemPendencia[] = [];
  for (const item of candidatos) {
    if (await reivindicar(sql, 'pendencia_influencer', item.chave, cadencia.folgaHoras)) aceitos.push(item);
  }
  if (aceitos.length === 0) return { afetados: 0 };

  try {
    await enviarNotificacao(sql, {
      tipo: 'pendencia_influencer',
      destinatarios: [...new Set(aceitos.flatMap((item) => (item.influencerId ? [item.influencerId] : [])))],
      assunto: 'Pendências do influencer',
      texto: textoPendencia(cadencia.folgaHoras, aceitos),
    });
  } catch (erro) {
    const chaves = aceitos.map((item) => item.chave);
    await sql`
      DELETE FROM notification_dispatches
      WHERE  kind = 'pendencia_influencer'
        AND  subject_key = ANY(${sql.array(chaves)}::text[])
    `;
    throw erro;
  }
  return { afetados: aceitos.length };
};

async function reivindicar(sql: Db, kind: string, chave: string, folgaHoras: number | null): Promise<boolean> {
  if (folgaHoras == null) {
    const linhas = await sql<{ subject_key: string }[]>`
      INSERT INTO notification_dispatches (kind, subject_key)
      VALUES (${kind}, ${chave})
      ON CONFLICT (kind, subject_key) DO NOTHING
      RETURNING subject_key
    `;
    return linhas.length > 0;
  }
  const linhas = await sql<{ subject_key: string }[]>`
    INSERT INTO notification_dispatches (kind, subject_key)
    VALUES (${kind}, ${chave})
    ON CONFLICT (kind, subject_key) DO UPDATE
      SET sent_at = now()
      WHERE notification_dispatches.sent_at <= now() - (${folgaHoras}::int * interval '1 hour')
    RETURNING subject_key
  `;
  return linhas.length > 0;
}
