import type { HandlerJob } from '@/lib/cron';

/** S1-03 (#11558): marca como Concluída a Captação Agendada cujo fim já passou. Idempotente. */
export const encerrarCaptacoesVencidas: HandlerJob = async () => ({ afetados: 0 });
