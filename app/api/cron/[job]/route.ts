import { NextResponse } from 'next/server';
import { iguaisEmTempoConstante } from '@/lib/crypto';
import { executarJob, ehJob } from '@/lib/cron';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

/** [PROTEGIDO] Disparado pelo agendador externo com Authorization: Bearer $CRON_SECRET. */

export const dynamic = 'force-dynamic';

function autorizado(req: Request): boolean {
  const segredo = env.cronSecret;
  const cabecalho = req.headers.get('authorization') ?? '';
  return segredo.length > 0 && iguaisEmTempoConstante(cabecalho, `Bearer ${segredo}`);
}

export async function POST(req: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!autorizado(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { job } = await params;
  if (!ehJob(job)) return NextResponse.json({ ok: false, mensagem: 'Job desconhecido' }, { status: 404 });

  const resultados = await executarJob(job, { sql: db(), agora: new Date() });
  const ok = resultados.every((r) => r.ok);
  return NextResponse.json({ ok, job, resultados }, { status: ok ? 200 : 500 });
}
