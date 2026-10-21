import postgres from 'postgres';
import { aplicarSeed, USUARIOS_SINTETICOS } from '../../db/seed';
import { gerarHashPin, gerarPinProvisorio } from '../../lib/pin';

/**
 * Uso local: pnpm db:seed [--pin]
 * Recusa rodar contra um banco com Usuários fora do domínio sintético `exemplo.test`.
 * Com --pin, gera um PIN provisório por Usuário sintético e o imprime só neste terminal.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Defina DATABASE_URL.');
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const [reais] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM users WHERE email NOT LIKE '%@exemplo.test'`;
    if ((reais?.n ?? 0) > 0) throw new Error('Banco contém Usuários reais: seed sintético recusado.');

    await aplicarSeed(sql);
    console.log(`Seed aplicado: ${USUARIOS_SINTETICOS.length} Usuários sintéticos.`);

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
