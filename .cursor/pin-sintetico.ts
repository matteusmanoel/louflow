import postgres from 'postgres';
import { validarDestinoSeed } from '../db/seed-guard.ts';
import { gerarHashPin } from '../lib/pin.ts';

/** PIN sintético já usado em e2e/ e tests/helpers/db.ts. Só preenche @exemplo.test sem PIN. */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL ausente');
  validarDestinoSeed(url, {
    SEED_ALLOW_REMOTE: process.env.SEED_ALLOW_REMOTE,
    SEED_REMOTE_HOSTS: process.env.SEED_REMOTE_HOSTS,
  });
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const [row] = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM users
      WHERE email LIKE '%@exemplo.test' AND pin_hash IS NULL`;
    if ((row?.n ?? 0) > 0) {
      const hash = await gerarHashPin('482916');
      await sql`
        UPDATE users
        SET pin_hash = ${hash}, must_reset_pin = false
        WHERE email LIKE '%@exemplo.test' AND pin_hash IS NULL`;
      console.log('PIN sintético definido para usuários @exemplo.test sem PIN.');
    } else {
      console.log('PIN sintético já presente (ou nenhum usuário sintético sem PIN).');
    }
  } finally {
    await sql.end();
  }
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
