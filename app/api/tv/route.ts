import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registrarErro } from '@/lib/error-log';
import { paraDtoTv } from '@/lib/tv';
import { carregarDadosTv } from '@/features/tv/consultas';

/** [PROTEGIDO] Payload público do Painel de TV, sem login, com cache de borda de 15 s. */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = paraDtoTv(await carregarDadosTv(db()));
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
    });
  } catch (erro) {
    await registrarErro(db(), 'servidor:tv', erro);
    return NextResponse.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
