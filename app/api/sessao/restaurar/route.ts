import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIE_DISPOSITIVO, COOKIE_SESSAO } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { criarSessao, usuarioDoDispositivo } from '@/lib/session';

/** [PROTEGIDO] Retoma a Sessão a partir do Dispositivo Confiável e volta ao destino. */

export const dynamic = 'force-dynamic';

function destinoSeguro(valor: string | null): string {
  return valor && valor.startsWith('/') && !valor.startsWith('//') ? valor : '/';
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const para = destinoSeguro(url.searchParams.get('para'));
  const jar = await cookies();
  const token = jar.get(COOKIE_DISPOSITIVO)?.value;
  const userId = token ? await usuarioDoDispositivo(db(), token) : null;

  if (!userId) {
    const resposta = NextResponse.redirect(new URL(`/login?para=${encodeURIComponent(para)}`, url));
    resposta.cookies.delete(COOKIE_DISPOSITIVO);
    return resposta;
  }

  const sessao = await criarSessao(db(), userId);
  const resposta = NextResponse.redirect(new URL(para, url));
  resposta.cookies.set(COOKIE_SESSAO, sessao, { httpOnly: true, secure: env.producao, sameSite: 'lax', path: '/' });
  return resposta;
}
