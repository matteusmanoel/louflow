import postgres from 'postgres';
import { aplicarMigrations, lerMigrations } from '../../db/runner';

/** Uso: DATABASE_URL=... pnpm db:migrate. Prefira a connection string direta (sem pooler). */
async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error('Defina DATABASE_URL (ou DATABASE_URL_UNPOOLED).');
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const novas = await aplicarMigrations(sql, await lerMigrations());
    console.log(novas.length ? `Aplicadas: ${novas.join(', ')}` : 'Nenhuma migration pendente.');
  } finally {
    await sql.end();
  }
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : 'Falha ao aplicar migrations');
  process.exit(1);
});
