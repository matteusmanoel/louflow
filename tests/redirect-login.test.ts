import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { criarSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from './helpers/db';

/** Cookies e cabeçalhos da "requisição" atual, controlados pelos testes. */
const req = vi.hoisted(() => ({ cookies: new Map<string, string>(), headers: new Map<string, string>() }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (nome: string) => (req.cookies.has(nome) ? { name: nome, value: req.cookies.get(nome)! } : undefined),
    set: (nome: string, valor: string) => void req.cookies.set(nome, valor),
    delete: (nome: string) => void req.cookies.delete(nome),
  }),
  headers: async () => ({ get: (nome: string) => req.headers.get(nome.toLowerCase()) ?? null }),
}));

usarBancoLimpo();

/** Executa `fn` e devolve o destino do redirect() lançado pelo Next (ou null se não houve). */
async function destinoDoRedirect(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
  } catch (erro) {
    const digest = (erro as { digest?: string }).digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) return digest.split(';')[2] ?? null;
    throw erro;
  }
  return null;
}

function limparRequisicao() {
  req.cookies.clear();
  req.headers.clear();
}

function formulario(campos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
}

describe('proxy: destino e login', () => {
  const chamar = async (caminho: string, cookie?: string, cabecalhos: Record<string, string> = {}) => {
    const { proxy } = await import('@/proxy');
    return proxy(new NextRequest(`http://localhost${caminho}`, { headers: { ...(cookie ? { cookie } : {}), ...cabecalhos } }));
  };

  it('sem cookie, o link direto vai ao login com o destino (caminho e query)', async () => {
    const r = await chamar('/demandas/LF123?aba=comentarios');
    expect(r.status).toBe(307);
    expect(r.headers.get('location')).toBe('http://localhost/login?para=%2Fdemandas%2FLF123%3Faba%3Dcomentarios');
  });

  it('sem cookie na raiz, o login fica sem destino; API devolve 401; rotas públicas passam', async () => {
    expect((await chamar('/')).headers.get('location')).toBe('http://localhost/login');
    expect((await chamar('/api/sync')).status).toBe(401);
    expect((await chamar('/login')).status).toBe(200);
    expect((await chamar('/tv')).status).toBe(200);
  });

  it('com cookie de sessão (mesmo expirado), grava o destino no cabeçalho da requisição e ignora o valor do navegador', async () => {
    const r = await chamar('/demandas/LF123?aba=historico', 'lf_sessao=token', { 'x-lf-destino': '//evil.com' });
    expect(r.status).toBe(200);
    expect(r.headers.get('x-middleware-request-x-lf-destino')).toBe('/demandas/LF123?aba=historico');
    const sem = await chamar('/api/drive/zip', 'lf_sessao=token');
    expect(sem.headers.get('x-middleware-request-x-lf-destino')).toBe('/');
  });

  it('remove o parâmetro interno _rsc do destino', async () => {
    const r = await chamar('/demandas/LF9?_rsc=abc', 'lf_sessao=token');
    expect(r.headers.get('x-middleware-request-x-lf-destino')).toBe('/demandas/LF9');
  });
});

describe('exigirModulo: sessão expirada volta à Demanda', () => {
  it('cookie de sessão inválido/expirado + link direto: login com o destino da Demanda', async () => {
    sqlTeste();
    limparRequisicao();
    req.cookies.set('lf_sessao', 'token-expirado');
    req.headers.set('x-lf-destino', '/demandas/LF123?aba=comentarios');
    const { exigirModulo } = await import('@/lib/auth');
    expect(await destinoDoRedirect(() => exigirModulo('demandas'))).toBe('/login?para=%2Fdemandas%2FLF123%3Faba%3Dcomentarios');
  });

  it('Dispositivo Confiável: a restauração recebe o destino da Demanda', async () => {
    sqlTeste();
    limparRequisicao();
    req.cookies.set('lf_dispositivo', 'dispositivo');
    req.headers.set('x-lf-destino', '/demandas/LF123');
    const { exigirModulo } = await import('@/lib/auth');
    expect(await destinoDoRedirect(() => exigirModulo('demandas'))).toBe('/api/sessao/restaurar?para=%2Fdemandas%2FLF123');
  });

  it('sem cabeçalho ou com cabeçalho inválido, cai no módulo (/demandas)', async () => {
    sqlTeste();
    limparRequisicao();
    const { exigirModulo } = await import('@/lib/auth');
    expect(await destinoDoRedirect(() => exigirModulo('demandas'))).toBe('/login?para=%2Fdemandas');
    req.headers.set('x-lf-destino', 'https://evil.com');
    expect(await destinoDoRedirect(() => exigirModulo('demandas'))).toBe('/login?para=%2Fdemandas');
  });

  it('PIN provisório: vai à troca de PIN levando a Demanda', async () => {
    sqlTeste();
    limparRequisicao();
    const u = await criarUsuario({ deveTrocarPin: true });
    req.cookies.set('lf_sessao', await criarSessao(db(), u.id));
    req.headers.set('x-lf-destino', '/demandas/LF123');
    const { exigirModulo } = await import('@/lib/auth');
    expect(await destinoDoRedirect(() => exigirModulo('demandas'))).toBe('/trocar-pin?para=%2Fdemandas%2FLF123');
  });
});

describe('login e troca de PIN levam ao destino', () => {
  const PIN = '482916';

  it('login com destino interno volta à Demanda', async () => {
    sqlTeste();
    limparRequisicao();
    const u = await criarUsuario({ pin: PIN });
    const { entrar } = await import('@/features/acesso/actions');
    expect(await destinoDoRedirect(() => entrar(null, formulario({ email: u.email, pin: PIN, para: '/demandas/LF123?aba=historico' })))).toBe(
      '/demandas/LF123?aba=historico',
    );
    expect(req.cookies.has('lf_sessao')).toBe(true);
  });

  it('login rejeita destinos externos (open redirect) e cai em /', async () => {
    sqlTeste();
    const u = await criarUsuario({ pin: PIN });
    const { entrar } = await import('@/features/acesso/actions');
    for (const ruim of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '/\t/evil.com', '/api/cron/x']) {
      limparRequisicao();
      expect(await destinoDoRedirect(() => entrar(null, formulario({ email: u.email, pin: PIN, para: ruim })))).toBe('/');
    }
  });

  it('com PIN provisório, o login vai à troca de PIN e leva o destino; destino ruim não vai junto', async () => {
    sqlTeste();
    const u = await criarUsuario({ pin: PIN, deveTrocarPin: true });
    const { entrar } = await import('@/features/acesso/actions');
    limparRequisicao();
    expect(await destinoDoRedirect(() => entrar(null, formulario({ email: u.email, pin: PIN, para: '/demandas/LF123' })))).toBe(
      '/trocar-pin?para=%2Fdemandas%2FLF123',
    );
    limparRequisicao();
    expect(await destinoDoRedirect(() => entrar(null, formulario({ email: u.email, pin: PIN, para: '//evil.com' })))).toBe('/trocar-pin');
  });

  it('a troca de PIN termina na Demanda pedida, e nunca em destino externo', async () => {
    sqlTeste();
    const { trocarPin } = await import('@/features/acesso/actions');
    const u = await criarUsuario({ pin: PIN, deveTrocarPin: true });
    limparRequisicao();
    req.cookies.set('lf_sessao', await criarSessao(db(), u.id));
    expect(await destinoDoRedirect(() => trocarPin(null, formulario({ pin: '135792', confirmacao: '135792', para: '/demandas/LF123?aba=comentarios' })))).toBe(
      '/demandas/LF123?aba=comentarios',
    );

    const v = await criarUsuario({ pin: PIN, deveTrocarPin: true });
    limparRequisicao();
    req.cookies.set('lf_sessao', await criarSessao(db(), v.id));
    expect(await destinoDoRedirect(() => trocarPin(null, formulario({ pin: '246813', confirmacao: '246813', para: '//evil.com' })))).toBe('/');

    const w = await criarUsuario({ pin: PIN, deveTrocarPin: true });
    limparRequisicao();
    req.cookies.set('lf_sessao', await criarSessao(db(), w.id));
    expect(await destinoDoRedirect(() => trocarPin(null, formulario({ pin: '975310', confirmacao: '975310', para: '/trocar-pin?para=/demandas/LF9' })))).toBe('/demandas/LF9');
  });

  it('ciclo completo por link direto: sessão expirada → login → troca de PIN → Demanda', async () => {
    sqlTeste();
    limparRequisicao();
    const u = await criarUsuario({ pin: PIN, deveTrocarPin: true });
    const { entrar, trocarPin } = await import('@/features/acesso/actions');
    const { exigirModulo } = await import('@/lib/auth');

    req.cookies.set('lf_sessao', 'expirada');
    req.headers.set('x-lf-destino', '/demandas/LF123');
    const login = await destinoDoRedirect(() => exigirModulo('demandas'));
    const para = new URL(login!, 'http://x').searchParams.get('para');
    expect(para).toBe('/demandas/LF123');

    req.cookies.clear();
    const trocar = await destinoDoRedirect(() => entrar(null, formulario({ email: u.email, pin: PIN, para: para! })));
    const paraTroca = new URL(trocar!, 'http://x').searchParams.get('para');
    expect(trocar).toBe('/trocar-pin?para=%2Fdemandas%2FLF123');

    const final = await destinoDoRedirect(() => trocarPin(null, formulario({ pin: '135792', confirmacao: '135792', para: paraTroca! })));
    expect(final).toBe('/demandas/LF123');
  });
});

describe('rota de restauração do Dispositivo Confiável', () => {
  it('não redireciona para fora do app', async () => {
    sqlTeste();
    limparRequisicao();
    const { GET } = await import('@/app/api/sessao/restaurar/route');
    for (const ruim of ['//evil.com', '/\\evil.com', 'https://evil.com']) {
      const r = await GET(new Request(`http://localhost/api/sessao/restaurar?para=${encodeURIComponent(ruim)}`));
      const alvo = new URL(r.headers.get('location')!, 'http://localhost');
      expect(alvo.origin).toBe('http://localhost');
    }
  });
});
