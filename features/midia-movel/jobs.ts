import type { HandlerJob } from '@/lib/cron';

/** S1-04 (#11591): marca como Finalizada a Reserva de Mídia Móvel cujo fim já passou. Idempotente. */
export const finalizarReservasVencidas: HandlerJob = async ({ sql }) => {
  const resultado = await sql<{ count: string }[]>`
    UPDATE media_reservations
       SET status = 'Finalizada'
     WHERE status = 'Reservada' AND ends_at < now()
    RETURNING id
  `;
  return { afetados: resultado.length };
};
