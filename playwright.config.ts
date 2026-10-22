import { defineConfig, devices } from '@playwright/test';

/**
 * S1-17 — Homologação E2E Fase 1.
 * Testes de fumaça cobrindo os fluxos críticos da Fase 1.
 *
 * Para pular todos os testes (ex.: CI sem DB/env):
 *   SKIP_E2E=1 pnpm exec playwright test
 *
 * Para rodar localmente com servidor já ativo na porta 3001:
 *   PORT=3001 pnpm dev &
 *   pnpm exec playwright test
 */

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  /* Falha rápida; sem retries em CI para E2E */
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    /* Captura de evidências em caso de falha */
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    /* Aguarda 10 s por navegações padrão */
    navigationTimeout: 10_000,
    actionTimeout: 8_000,
  },

  projects: [
    /* Setup: cria usuário de teste e salva estado de autenticação */
    {
      name: 'setup',
      testMatch: /e2e\/global-setup\.ts/,
    },
    /* Testes de fumaça usando estado de autenticação salvo pelo setup */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
      testIgnore: /global-setup\.ts/,
    },
  ],

  /* Inicia o servidor Next.js na porta 3001 se ainda não estiver rodando */
  webServer: process.env.SKIP_E2E
    ? undefined
    : {
        command: `PORT=${new URL(BASE_URL).port || 3001} pnpm dev`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 90_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
