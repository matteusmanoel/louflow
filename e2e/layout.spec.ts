import { expect, test } from '@playwright/test';

/**
 * Regressão de layout. A fatia S1-17 é dona de e2e/; este arquivo é aditivo.
 * Rotas com id dependem de um registro já listado. Sem registro, o caso é pulado.
 */

const ROTAS = [
  '/demandas',
  '/demandas?visao=quadro',
  '/demandas/nova',
  '/fichas',
  '/ficha-tecnica',
  '/aprovacoes',
  '/cortes',
  '/pendencias',
  '/agenda',
  '/captacoes',
  '/captacoes/nova',
  '/midia-movel',
  '/drone',
  '/drone/novo',
  '/usuarios',
  '/usuarios/novo',
  '/lixeira',
  '/auditoria',
  '/preferencias',
  '/equipamentos',
  '/dashboard',
  '/relatorio',
  '/ranking',
  '/analista',
  '/wiki',
  '/sorteios',
];

const LARGURAS = [1440, 650, 390];
const ID_INTERNO = /S\d-\d{2} #\d+/;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

async function conferirPagina(page: import('@playwright/test').Page, rota: string) {
  const resposta = await page.goto(rota, { waitUntil: 'domcontentloaded' });
  expect(resposta?.status() ?? 200).toBeLessThan(500);
  if (!page.url().includes(rota)) {
    test.info().annotations.push({ type: 'pulada', description: `${rota} redirecionou para ${page.url()}` });
    return;
  }

  const medidas = await page.evaluate(() => ({
    estouro: document.documentElement.scrollWidth - window.innerWidth,
    mains: document.querySelectorAll('main').length,
    h1: document.querySelectorAll('h1').length,
    texto: document.body.innerText,
  }));

  expect(medidas.estouro, `${rota} estoura ${medidas.estouro}px`).toBeLessThanOrEqual(1);
  expect(medidas.mains, rota).toBe(1);
  expect(medidas.h1, rota).toBe(1);
  expect(medidas.texto, rota).not.toMatch(ID_INTERNO);
  expect(medidas.texto, rota).not.toMatch(UUID);
}

test.describe('layout das rotas auditadas', () => {
  for (const largura of LARGURAS) {
    test(`não estoura e tem um título em ${largura}px`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width: largura, height: 800 });
      for (const rota of ROTAS) await conferirPagina(page, rota);

      await page.goto('/demandas');
      const detalhe = page.locator('a[href^="/demandas/"]').filter({ hasNotText: 'Nova' }).first();
      if (await detalhe.count()) {
        const href = await detalhe.getAttribute('href');
        if (href && href !== '/demandas/nova') await conferirPagina(page, href);
      }
    });
  }
});

test('login sem sessão tem um título e não estoura', async ({ browser }) => {
  const contexto = await browser.newContext({ storageState: { cookies: [], origins: [] }, viewport: { width: 1440, height: 800 } });
  const page = await contexto.newPage();
  await conferirPagina(page, '/login');
  await contexto.close();
});
