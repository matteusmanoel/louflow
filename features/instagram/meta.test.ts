import { afterEach, describe, expect, it } from 'vitest';
import { definirClienteMeta, clienteMeta } from './meta';

afterEach(() => {
  definirClienteMeta(null);
});

function json(dados: unknown, status = 200) {
  return new Response(JSON.stringify(dados), { status, headers: { 'content-type': 'application/json' } });
}

describe('cliente Graph', () => {
  it('envia o token no cabeçalho e marca a conta acessível', async () => {
    const original = globalThis.fetch;
    const urls: string[] = [];
    const token = 'EAA-cabecalho-somente';
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      urls.push(url);
      expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${token}`);
      expect(url).not.toContain(token);
      if (url.includes('/me?')) return json({ id: 'su-9', name: 'Sistema' });
      if (url.includes('/me/accounts')) return json({ data: [] });
      if (url.includes('/assigned_pages')) {
        return json({
          data: [{ id: 'pg-9', name: 'Página', instagram_business_account: { id: 'ig-9', username: 'conta.test', name: 'Conta' } }],
        });
      }
      if (url.includes('/ig-9')) return json({ id: 'ig-9', username: 'conta.test' });
      return json({ data: [] });
    };

    try {
      const resultado = await clienteMeta().sincronizar(token);
      expect(resultado.contas).toEqual([
        expect.objectContaining({ igUserId: 'ig-9', username: 'conta.test', acessivel: true, erro: null }),
      ]);
      expect(urls.some((url) => url.includes('access_token='))).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
  });
});
