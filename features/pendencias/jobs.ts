import type { HandlerJob } from '@/lib/cron';
import { avisarPendenciasInfluencer } from '@/features/notificacoes/jobs';

/** S1-16: o cron de 15 min acorda a checagem. A cadência e o texto ficam nos avisos. */
export const processarPendencias: HandlerJob = (ctx) => avisarPendenciasInfluencer(ctx);
