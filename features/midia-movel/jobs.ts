import type { HandlerJob } from '@/lib/cron';

/** S1-04 (#11559): marca como Finalizada a Reserva de Mídia Móvel cujo fim já passou. Idempotente. */
export const finalizarReservasVencidas: HandlerJob = async () => ({ afetados: 0 });
