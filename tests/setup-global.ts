import postgres from 'postgres';
import { aplicarMigrations, lerMigrations } from '../db/runner';

export const URL_TESTE_PADRAO = 'postgres://louflow:louflow@localhost:54331/louflow_test';

/** Recria o banco de teste e aplica todas as migrations uma vez por execução. */
export default async function setup() {
  const url = new URL(process.env.DATABASE_URL_TEST ?? URL_TESTE_PADRAO);
  const nome = url.pathname.slice(1);
  if (!/^[a-z0-9_]*test[a-z0-9_]*$/.test(nome)) throw new Error(`Banco de teste deve conter "test" no nome: ${nome}`);

  const admin = new URL(url);
  admin.pathname = '/postgres';
  const sqlAdmin = postgres(admin.toString(), { max: 1, onnotice: () => {} });
  try {
    await sqlAdmin.unsafe(`DROP DATABASE IF EXISTS ${nome} WITH (FORCE)`);
    await sqlAdmin.unsafe(`CREATE DATABASE ${nome}`);
  } catch (erro) {
    throw new Error(`Postgres de teste indisponível. Rode "pnpm db:up". (${(erro as Error).message})`);
  } finally {
    await sqlAdmin.end();
  }

  const sql = postgres(url.toString(), { max: 1, onnotice: () => {} });
  try {
    await aplicarMigrations(sql, await lerMigrations());
  } finally {
    await sql.end();
  }
}
