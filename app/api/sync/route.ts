import { NextResponse } from 'next/server';
import { obterSessao } from '@/lib/auth';
import { db } from '@/lib/db';
import { revisaoAtual } from '@/lib/history';

/** [PROTEGIDO] Verificação leve para o polling de 30 s: { alterou, revisao }. */

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const usuario = await obterSessao();
  if (!usuario) return NextResponse.json({ ok: false }, { status: 401 });

  const desde = Number(new URL(req.url).searchParams.get('desde') ?? 0) || 0;
  const revisao = await revisaoAtual(db());
  return NextResponse.json(
    { alterou: revisao !== desde, revisao },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
