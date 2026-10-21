import 'server-only';
import type { Sql } from './db';
import { registrarErro } from './error-log';
import { encerrarCaptacoesVencidas } from '@/features/captacoes/jobs';
import { finalizarReservasVencidas } from '@/features/midia-movel/jobs';
import { processarPendencias } from '@/features/pendencias/jobs';
import { enviarAlertasPrazo } from '@/features/notificacoes/jobs';

/**
 * [PROTEGIDO] Registro de jobs. Cada handler é idempotente e vive na pasta da fatia dona;
 * este arquivo só mapeia nome → handlers e não muda quando a fatia implementa o job.
 */

export type ContextoJob = { sql: Sql; agora: Date };
export type HandlerJob = (ctx: ContextoJob) => Promise<{ afetados: number }>;

export const JOBS = {
  encerramentos: { encerrarCaptacoesVencidas, finalizarReservasVencidas },
  pendencias: { processarPendencias },
  'alertas-prazo': { enviarAlertasPrazo },
} satisfies Record<string, Record<string, HandlerJob>>;

export type NomeJob = keyof typeof JOBS;

export function ehJob(nome: string): nome is NomeJob {
  return Object.hasOwn(JOBS, nome);
}

export async function executarJob(nome: NomeJob, ctx: ContextoJob) {
  const resultados: { handler: string; ok: boolean; afetados: number }[] = [];
  for (const [nomeHandler, handler] of Object.entries(JOBS[nome] as Record<string, HandlerJob>)) {
    try {
      const { afetados } = await handler(ctx);
      resultados.push({ handler: nomeHandler, ok: true, afetados });
    } catch (erro) {
      await registrarErro(ctx.sql, `cron:${nome}`, erro, nomeHandler);
      resultados.push({ handler: nomeHandler, ok: false, afetados: 0 });
    }
  }
  return resultados;
}
