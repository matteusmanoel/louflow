import { NextResponse, type NextRequest } from 'next/server';

/**
 * [PROTEGIDO] Checagem otimista: sem cookie de Sessão nem de Dispositivo Confiável, vai para o login.
 * A validação real acontece no servidor (lib/auth) em cada página, rota e Server Action.
 */

const PUBLICAS = ['/login', '/tv', '/api/tv', '/api/cron', '/api/sessao'];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const temCookie = req.cookies.has('lf_sessao') || req.cookies.has('lf_dispositivo');
  if (temCookie) return NextResponse.next();

  if (pathname.startsWith('/api/')) return NextResponse.json({ ok: false }, { status: 401 });
  const login = new URL('/login', req.url);
  login.searchParams.set('para', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|logo-loumar.png|.*\\.(?:png|jpg|svg|ico|webp)$).*)'],
};
