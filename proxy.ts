import { NextResponse, type NextRequest } from 'next/server';
import { CABECALHO_DESTINO, caminhoLogin, destinoInterno } from '@/lib/destino';

/**
 * [PROTEGIDO] Checagem otimista: sem cookie de Sessão nem de Dispositivo Confiável, vai para o login.
 * A validação real acontece no servidor (lib/auth) em cada página, rota e Server Action.
 * O destino da requisição segue no cabeçalho x-lf-destino (sempre regravado aqui) para que uma
 * Sessão expirada, com cookie ainda presente, também volte à página pedida depois do login.
 */

const PUBLICAS = ['/login', '/tv', '/api/tv', '/api/cron', '/api/sessao'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  const alvo = req.nextUrl.clone();
  alvo.searchParams.delete('_rsc');
  const caminho = alvo.pathname + alvo.search;

  const cabecalhos = new Headers(req.headers);
  cabecalhos.delete(CABECALHO_DESTINO);

  const temCookie = req.cookies.has('lf_sessao') || req.cookies.has('lf_dispositivo');
  if (temCookie) {
    cabecalhos.set(CABECALHO_DESTINO, destinoInterno(caminho));
    return NextResponse.next({ request: { headers: cabecalhos } });
  }

  if (pathname.startsWith('/api/')) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.redirect(new URL(caminhoLogin(caminho), req.url));
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|logo-loumar.png|.*\\.(?:png|jpg|svg|ico|webp)$).*)'],
};
