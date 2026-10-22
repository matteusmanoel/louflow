/**
 * S1-17 — Setup E2E: cria usuário administrador de teste no banco e salva estado
 * de autenticação em e2e/.auth/admin.json para reutilização nos testes.
 *
 * Pula tudo se SKIP_E2E=1 estiver definido.
 */
import { test as setup, expect } from '@playwright/test';
import { createHmac, createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

/* ── Constantes do usuário de teste ──────────────────────────────────────── */
export const E2E_ADMIN_EMAIL = 'e2e-admin@exemplo.test';
export const E2E_ADMIN_PIN = '482916';
export const E2E_ADMIN_NAME = 'E2E Admin';
export const AUTH_FILE = 'e2e/.auth/admin.json';

/* ── Auxiliares (replicam lib/pin.ts e lib/crypto.ts sem server-only) ───── */
function carregarEnv(): Record<string, string> {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    const env: Record<string, string> = {};
    for (const linha of raw.split('\n')) {
      const m = linha.match(/^([^#=\s][^=]*)=(.*)$/);
      if (m) env[m[1]!.trim()] = m[2]!.trim().replace(/^["']|["']$/g, '');
    }
    return env;
  } catch {
    return {};
  }
}

function tokenAleatorio(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function gerarHashPin(pin: string, pepper: string): Promise<string> {
  const { hash } = await import('bcryptjs');
  const pepperedPin = createHmac('sha256', pepper).update(pin).digest('base64');
  return hash(pepperedPin, 11);
}

/* ── Setup: cria usuário e sessão, salva estado ──────────────────────────── */
setup('autenticar usuário de teste', async ({ page }) => {
  if (process.env.SKIP_E2E) {
    console.log('[E2E] SKIP_E2E definido — pulando setup de autenticação.');
    // Cria arquivo de estado vazio para não quebrar os testes dependentes
    const fs = await import('node:fs');
    const dir = resolve(process.cwd(), 'e2e/.auth');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      resolve(process.cwd(), AUTH_FILE),
      JSON.stringify({ cookies: [], origins: [] }),
    );
    return;
  }

  const env = carregarEnv();
  const dbUrl = process.env.DATABASE_URL ?? env['DATABASE_URL'];

  if (!dbUrl) {
    console.warn('[E2E] DATABASE_URL não encontrada — setup pulado, testes de auth falharão.');
    const fs = await import('node:fs');
    fs.writeFileSync(
      resolve(process.cwd(), AUTH_FILE),
      JSON.stringify({ cookies: [], origins: [] }),
    );
    return;
  }

  const pepper = process.env.PIN_PEPPER ?? env['PIN_PEPPER'] ?? '';
  const sql = postgres(dbUrl, { max: 1 });

  try {
    /* 1. Remove usuário de teste anterior (evita acúmulo entre runs) */
    await sql`DELETE FROM users WHERE email = ${E2E_ADMIN_EMAIL}`;

    /* 2. Cria usuário Administrador sem reset de PIN obrigatório */
    const pinHash = await gerarHashPin(E2E_ADMIN_PIN, pepper);
    const [user] = await sql<{ id: string; access_version: number }[]>`
      INSERT INTO users (email, name, profile, pin_hash, must_reset_pin, is_active)
      VALUES (
        ${E2E_ADMIN_EMAIL},
        ${E2E_ADMIN_NAME},
        'Administrador',
        ${pinHash},
        false,
        true
      )
      RETURNING id, access_version`;

    if (!user) throw new Error('[E2E] Falha ao criar usuário de teste');

    /* 3. Cria sessão diretamente no banco (evita depender da UI de login no setup) */
    const token = tokenAleatorio();
    const digest = digestToken(token);
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6h

    await sql`
      INSERT INTO session_tokens (token_digest, user_id, access_version, expires_at)
      VALUES (${digest}, ${user.id}, ${user.access_version}, ${expiresAt})`;

    /* 4. Salva estado de autenticação (cookie lf_sessao) */
    const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
    const urlObj = new URL(baseUrl);

    await page.context().addCookies([
      {
        name: 'lf_sessao',
        value: token,
        domain: urlObj.hostname,
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    /* 5. Verifica que a sessão funciona navegando para a rota inicial */
    await page.goto(baseUrl);
    // Administrador deve cair em /demandas (rota preferida naoPremios)
    await expect(page).toHaveURL(/\/(demandas|dashboard|sem-acesso)/, { timeout: 15_000 });

    await page.context().storageState({ path: AUTH_FILE });
    console.log(`[E2E] Setup concluído — usuário: ${E2E_ADMIN_EMAIL}`);
  } finally {
    await sql.end();
  }
});
