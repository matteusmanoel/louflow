import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type postgres from 'postgres';

/**
 * Runner de migrations: aplica em ordem lexicográfica os arquivos `db/migrations/*.sql`
 * ainda não registrados, cada um na própria transação, e registra o checksum.
 * Migration já aplicada com conteúdo diferente aborta tudo: correção vira migration nova.
 */

export const PASTA_MIGRATIONS = path.join(process.cwd(), 'db', 'migrations');
const TRAVA = 4_242_001;

export type ArquivoMigration = { nome: string; sql: string; checksum: string };

export const checksum = (conteudo: string) => createHash('sha256').update(conteudo).digest('hex');

export async function lerMigrations(pasta = PASTA_MIGRATIONS): Promise<ArquivoMigration[]> {
  const nomes = (await readdir(pasta)).filter((n) => n.endsWith('.sql')).sort();
  return Promise.all(
    nomes.map(async (nome) => {
      const sql = await readFile(path.join(pasta, nome), 'utf8');
      return { nome, sql, checksum: checksum(sql) };
    }),
  );
}

export class MigrationAlterada extends Error {
  constructor(nome: string) {
    super(`Migration já aplicada foi alterada: ${nome}. Crie uma nova migration em vez de editar.`);
    this.name = 'MigrationAlterada';
  }
}

export async function aplicarMigrations(sql: postgres.Sql, arquivos: ArquivoMigration[]): Promise<string[]> {
  await sql`SELECT pg_advisory_lock(${TRAVA})`;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`;
    const aplicadas = new Map(
      (await sql<{ name: string; checksum: string }[]>`SELECT name, checksum FROM schema_migrations`).map((r) => [r.name, r.checksum]),
    );

    for (const a of arquivos) {
      const registrado = aplicadas.get(a.nome);
      if (registrado && registrado !== a.checksum) throw new MigrationAlterada(a.nome);
    }

    const novas: string[] = [];
    for (const a of arquivos) {
      if (aplicadas.has(a.nome)) continue;
      await sql.begin(async (tx) => {
        await tx.unsafe(a.sql);
        await tx`INSERT INTO schema_migrations (name, checksum) VALUES (${a.nome}, ${a.checksum})`;
      });
      novas.push(a.nome);
    }
    return novas;
  } finally {
    await sql`SELECT pg_advisory_unlock(${TRAVA})`;
  }
}
