import { expect, test } from '@playwright/test';
import { AUTH_INFLUENCER, AUTH_PREMIOS } from './contas';

test.describe('navegação', () => {
  test('grupos abrem, fecham e persistem', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    await page.goto('/demandas');
    await page.evaluate(() => localStorage.removeItem('louFlowGruposMenu'));
    await page.reload();

    const menu = page.getByRole('navigation', { name: 'Menu principal' });
    const producao = menu.getByRole('button', { name: 'Produção' });
    await expect(producao).toHaveAttribute('aria-expanded', 'true');
    await producao.click();
    await expect(producao).toHaveAttribute('aria-expanded', 'true');

    const recursos = menu.getByRole('button', { name: 'Recursos' });
    const antes = await recursos.getAttribute('aria-expanded');
    await recursos.click();
    await expect(recursos).toHaveAttribute('aria-expanded', antes === 'true' ? 'false' : 'true');

    const emBreve = menu.getByRole('button', { name: 'Em breve' });
    await expect(emBreve).toHaveAttribute('aria-expanded', 'false');
    await emBreve.click();
    await expect(emBreve).toHaveAttribute('aria-expanded', 'true');

    await page.reload();
    await expect(menu.getByRole('button', { name: 'Recursos' })).toHaveAttribute(
      'aria-expanded',
      antes === 'true' ? 'false' : 'true',
    );
    await expect(menu.getByRole('button', { name: 'Em breve' })).toHaveAttribute('aria-expanded', 'true');
  });

  test('a bottom bar do admin segue a prioridade', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('/demandas');
    const barra = page.getByRole('navigation', { name: 'Navegação rápida' });
    await expect(barra.getByRole('link')).toHaveText(['Demandas', 'Aprovar', 'Pendências', 'Agenda']);
    await expect(barra.getByRole('button', { name: 'Mais' })).toBeVisible();
  });

  test('Prêmios não tem bottom bar nem hambúrguer', async ({ browser }) => {
    const contexto = await browser.newContext({
      storageState: AUTH_PREMIOS,
      viewport: { width: 390, height: 800 },
    });
    const page = await contexto.newPage();
    await page.goto('/sorteios');
    await expect(page.getByRole('navigation', { name: 'Navegação rápida' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir menu de navegação' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sorteios');
    await contexto.close();
  });

  test('Influencer sem permissão sai da rota', async ({ browser }) => {
    const contexto = await browser.newContext({
      storageState: AUTH_INFLUENCER,
      viewport: { width: 1440, height: 800 },
    });
    const page = await contexto.newPage();
    await page.goto('/usuarios');
    await expect(page).toHaveURL(/aviso=sem-permissao/);
    await expect(page).not.toHaveURL(/\/usuarios/);
    await contexto.close();
  });
});
