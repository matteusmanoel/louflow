import { expect, test } from '@playwright/test';

test.describe('tema', () => {
  test.beforeEach(async ({ page }) => {
    const erros: string[] = [];
    page.on('pageerror', (erro) => erros.push(erro.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && /hydrat/i.test(msg.text())) erros.push(msg.text());
    });
    (page as unknown as { __erros: string[] }).__erros = erros;
  });

  test('persiste claro, escuro e sistema, sem erro de hidratação', async ({ page }) => {
    const erros = (page as unknown as { __erros: string[] }).__erros;
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/demandas');

    const tema = page.getByRole('navigation', { name: 'Menu principal' }).getByRole('group', { name: 'Tema' });
    await expect(tema).toBeVisible();
    await expect(page.locator('header.topo-shell').getByRole('group', { name: 'Tema' })).toHaveCount(0);

    await page.evaluate(() => localStorage.setItem('louFlowTema', 'claro'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');

    await page.evaluate(() => localStorage.setItem('louFlowTema', 'escuro'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');

    await page.emulateMedia({ colorScheme: 'light' });
    await page.evaluate(() => localStorage.setItem('louFlowTema', 'sistema'));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'claro');

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'escuro');

    const hidratacao = erros.filter((texto) => /hydrat/i.test(texto));
    expect(hidratacao).toEqual([]);
  });
});
