import type { HandlerJob } from '@/lib/cron';
import type { Db } from '@/lib/db';
import { enviarNotificacao } from './enviador';
import { lerCadencia } from './consultas';
import { lerCanal } from './canal';
import { textoResumoDiario } from './mensagens';
import { formatarDia, relogioSaoPaulo } from './relogio';

const KIND_RESUMO = 'resumo_diario';

type LinhaAtrasada = { title: string; prazo: string; editor_id: string | null };
type LinhaAprovacao = { title: string; influencer_id: string | null };

/**
 * Uma mensagem por dia, no horário configurado (padrão 10h, America/Sao_Paulo).
 * Atrasadas mencionam o editor. Em aprovação, o influencer.
 * Sem pendência, não envia e não trava o dia.
 */
export const enviarResumoDiario: HandlerJob = async ({ sql, agora }) => {
  const cadencia = await lerCadencia(sql);
  const relogio = relogioSaoPaulo(agora);
  if (relogio.hora !== cadencia.horaPrazo) return { afetados: 0 };
  if (!lerCanal().pronto) return { afetados: 0 };

  const atrasadas = await sql<LinhaAtrasada[]>`
    SELECT d.title,
           COALESCE(d.post_date, d.approval_date)::text AS prazo,
           d.editor_id
    FROM   demands d
    WHERE  d.deleted_at IS NULL
      AND  d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
      AND  COALESCE(d.post_date, d.approval_date) < ${relogio.dia}::date
    ORDER BY prazo, d.title
  `;
  const aprovacao = await sql<LinhaAprovacao[]>`
    SELECT d.title, d.influencer_id
    FROM   demands d
    WHERE  d.deleted_at IS NULL
      AND  d.status = 'Aprovação'
    ORDER BY d.title
  `;
  const total = atrasadas.length + aprovacao.length;
  if (total === 0) return { afetados: 0 };

  if (!(await reivindicar(sql, KIND_RESUMO, relogio.dia))) return { afetados: 0 };

  const atrasadasTexto = atrasadas.map((linha) => ({
    titulo: linha.title,
    prazo: formatarDia(linha.prazo),
    editorId: linha.editor_id,
  }));
  const aprovacaoTexto = aprovacao.map((linha) => ({
    titulo: linha.title,
    influencerId: linha.influencer_id,
  }));
  const destinatarios = [
    ...atrasadas.flatMap((linha) => (linha.editor_id ? [linha.editor_id] : [])),
    ...aprovacao.flatMap((linha) => (linha.influencer_id ? [linha.influencer_id] : [])),
  ];

  try {
    await enviarNotificacao(sql, {
      tipo: 'resumo_diario',
      destinatarios: [...new Set(destinatarios)],
      assunto: 'Pendências do dia',
      texto: textoResumoDiario({ atrasadas: atrasadasTexto, aprovacao: aprovacaoTexto }),
    });
  } catch (erro) {
    await sql`DELETE FROM notification_dispatches WHERE kind = ${KIND_RESUMO} AND subject_key = ${relogio.dia}`;
    throw erro;
  }
  return { afetados: total };
};

/** O cron diário antigo chama o mesmo resumo. A trava impede uma segunda mensagem. */
export const enviarAlertasPrazo: HandlerJob = (ctx) => enviarResumoDiario(ctx);

/** O cron de 15 min é o relógio. Fora da hora configurada, não envia. */
export const avisarPendenciasInfluencer: HandlerJob = (ctx) => enviarResumoDiario(ctx);

async function reivindicar(sql: Db, kind: string, chave: string): Promise<boolean> {
  const linhas = await sql<{ subject_key: string }[]>`
    INSERT INTO notification_dispatches (kind, subject_key)
    VALUES (${kind}, ${chave})
    ON CONFLICT (kind, subject_key) DO NOTHING
    RETURNING subject_key
  `;
  return linhas.length > 0;
}
