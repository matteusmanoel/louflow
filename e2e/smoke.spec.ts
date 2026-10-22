/**
 * S1-17 — Testes de Fumaça E2E — Homologação Fase 1
 *
 * Cobre os fluxos críticos de UX da Fase 1 do LouFlow.
 * Cada teste é independente e usa o estado de autenticação de
 * e2e/.auth/admin.json (criado pelo global-setup.ts).
 *
 * Para pular todos os testes em ambientes sem infraestrutura completa:
 *   SKIP_E2E=1 pnpm exec playwright test
 */
import { test, expect } from '@playwright/test';

/* ── Guard global ─────────────────────────────────────────────────────────── */
test.beforeEach(async ({}, testInfo) => {
  if (process.env.SKIP_E2E) {
    testInfo.skip(true, 'SKIP_E2E definido — testes E2E desabilitados neste ambiente.');
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   GRUPO 1 — Páginas públicas (sem autenticação)
   ══════════════════════════════════════════════════════════════════════════ */

test('S1-01 — página de login carrega com formulário visível', async ({ browser }) => {
  /* Usa contexto limpo (sem cookies de sessão) */
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();

  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);

  /* Verifica presença dos campos fundamentais do formulário */
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="pin"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();

  await ctx.close();
});

test('S1-02 — painel de TV carrega sem autenticação', async ({ browser }) => {
  /* TV é rota pública — não deve exigir login */
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();

  await page.goto('/tv');
  await expect(page).toHaveURL('/tv');
  /* A página não deve redirecionar para /login */
  await expect(page).not.toHaveURL(/\/login/);

  await ctx.close();
});

test('S1-03 — acesso sem autenticação a /demandas redireciona para login', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();

  await page.goto('/demandas');
  /* Deve redirecionar para /login ou /api/sessao/restaurar → /login */
  await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });

  await ctx.close();
});

/* ═══════════════════════════════════════════════════════════════════════════
   GRUPO 2 — Fluxo de login
   ══════════════════════════════════════════════════════════════════════════ */

test('S1-04 — login com credenciais inválidas exibe mensagem de erro', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();

  await page.goto('/login');
  await page.locator('input[name="email"]').fill('naoexiste@exemplo.test');
  await page.locator('input[name="pin"]').fill('000000');
  await page.locator('button[type="submit"]').click();

  /* Deve permanecer em /login e exibir mensagem de erro */
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  /* Algum texto de erro deve estar visível na página */
  await expect(page.locator('body')).toContainText(/inválido|bloqueado|e-mail/i, { timeout: 8_000 });

  await ctx.close();
});

test('S1-05 — login bem-sucedido redireciona para rota inicial do usuário', async ({ browser }) => {
  /**
   * Usa o usuário criado pelo global-setup (E2E Admin — Administrador).
   * O login via formulário valida o fluxo completo de autenticação:
   * formulário → Server Action → cookie → redirect.
   */
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();

  await page.goto('/login');
  await page.locator('input[name="email"]').fill('e2e-admin@exemplo.test');
  await page.locator('input[name="pin"]').fill('482916');
  await page.locator('button[type="submit"]').click();

  /* Após login de Administrador (naoPremios), deve ir para /demandas */
  await expect(page).toHaveURL(/\/(demandas|dashboard)/, { timeout: 15_000 });

  await ctx.close();
});

/* ═══════════════════════════════════════════════════════════════════════════
   GRUPO 3 — Páginas protegidas (usa estado de auth do setup)
   ══════════════════════════════════════════════════════════════════════════ */

test('S1-06 — /demandas carrega para usuário autenticado', async ({ page }) => {
  await page.goto('/demandas');
  await expect(page).toHaveURL('/demandas', { timeout: 10_000 });
  /* Deve ter algum conteúdo da página (não apenas o shell) */
  await expect(page.locator('main, h1, [data-testid]')).toBeVisible({ timeout: 8_000 });
});

test('S1-07 — /preferencias carrega para usuário autenticado', async ({ page }) => {
  await page.goto('/preferencias');
  await expect(page).toHaveURL('/preferencias', { timeout: 10_000 });
  /* Página de preferências deve ter conteúdo visível */
  await expect(page.locator('main')).toBeVisible({ timeout: 8_000 });
});

test('S1-08 — /cortes carrega para admin (permissão verAbaCortes)', async ({ page }) => {
  /**
   * Administrador tem verAbaCortes por padrão (ver lib/permissions.ts).
   * Se a página redirecionar com ?aviso=sem-permissao, o teste falhará
   * alertando que a permissão padrão foi alterada ou a guarda mudou.
   */
  await page.goto('/cortes');
  await expect(page).toHaveURL('/cortes', { timeout: 10_000 });
  await expect(page).not.toHaveURL(/sem-permissao/);
});

test('S1-09 — /auditoria carrega para admin (perfil Administrador)', async ({ page }) => {
  await page.goto('/auditoria');
  await expect(page).toHaveURL('/auditoria', { timeout: 10_000 });
  /* Não deve redirecionar para sem-acesso nem login */
  await expect(page).not.toHaveURL(/\/login|sem-permissao/);
  await expect(page.locator('main')).toBeVisible({ timeout: 8_000 });
});

test('S1-10 — /lixeira carrega para admin (permissão verLixeira)', async ({ page }) => {
  await page.goto('/lixeira');
  await expect(page).toHaveURL('/lixeira', { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/login|sem-permissao/);
  await expect(page.locator('main')).toBeVisible({ timeout: 8_000 });
});
