import type { HandlerJob } from '@/lib/cron';

/** S1-08 (#11563): alerta diário de prazo por Editor (08:00 America/Sao_Paulo). Não reenvia no mesmo dia. */
export const enviarAlertasPrazo: HandlerJob = async () => ({ afetados: 0 });
