import postgres from 'postgres';
import { aplicarSeed, USUARIOS_SINTETICOS } from '../../db/seed';
import { gerarHashPin, gerarPinProvisorio } from '../../lib/pin';

/**
 * Uso local: pnpm db:seed [--pin]
 * Só roda com DATABASE_URL em localhost. Usuários fora de @exemplo.test não são alterados.
 * Com --pin, gera um PIN provisório por Usuário sintético e o imprime só neste terminal.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Defina DATABASE_URL.');
  const host = new URL(url).hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error('Seed recusado: DATABASE_URL não aponta para localhost.');
  }
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const [reais] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM users WHERE email NOT LIKE '%@exemplo.test'`;
    if ((reais?.n ?? 0) > 0) {
      console.warn(`Aviso: ${reais?.n} usuário(s) fora de @exemplo.test permanecem intactos.`);
    }

    await aplicarSeed(sql);
    console.log(`Seed aplicado: ${USUARIOS_SINTETICOS.length} usuários sintéticos e conteúdo de demonstração.`);

    if (process.argv.includes('--pin')) {
      for (const u of USUARIOS_SINTETICOS) {
        const pin = gerarPinProvisorio();
        await sql`UPDATE users SET pin_hash = ${await gerarHashPin(pin)}, must_reset_pin = true WHERE email = ${u.email}`;
        console.log(`${u.email}  PIN provisório: ${pin}`);
      }
    }
  } finally {
    await sql.end();
  }
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : 'Falha no seed');
  process.exit(1);
});
