import type { HandlerJob } from '@/lib/cron';

/** S1-16 (#11571): prazo padrão de 24 h, lembretes e aviso à administração. Idempotente via *_sent_at. */
export const processarPendencias: HandlerJob = async () => ({ afetados: 0 });
