import type { HandlerJob } from '@/lib/cron';

/** S1-03 (#11558): marca como Concluída a Captação Agendada cujo fim já passou. Idempotente. */
export const encerrarCaptacoesVencidas: HandlerJob = async ({ sql, agora }) => {
  const linhas = await sql`
    UPDATE captures
    SET status = 'Concluída', completed_at = ends_at
    WHERE status = 'Agendada' AND ends_at < ${agora}
    RETURNING id
  `;
  return { afetados: linhas.length };
};
