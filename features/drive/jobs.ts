import type { HandlerJob } from '@/lib/cron';
import { expurgarVencidos } from './expurgo';

/** Apaga da lixeira do Drive o que passou de 30 dias. Idempotente. */
export const expurgarDrive: HandlerJob = async ({ sql, agora }) => ({
  afetados: await expurgarVencidos(sql, agora),
});
