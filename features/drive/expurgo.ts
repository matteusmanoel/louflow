import 'server-only';
import type { Db, Sql } from '@/lib/db';
import { chaveDaUrl } from '@/lib/armazenamento-chave';
import { removerObjetos } from '@/lib/armazenamento';
import { env } from '@/lib/env';

const DIAS = 30;

type NoApagavel = {
  id: string;
  url: string | null;
  demand_file_id: string | null;
};

async function subarvore(db: Db, raizes: readonly string[]): Promise<NoApagavel[]> {
  if (raizes.length === 0) return [];
  return db<NoApagavel[]>`
    WITH RECURSIVE arvore AS (
      SELECT id, url, demand_file_id, 0 AS nivel
      FROM drive_nodes
      WHERE id = ANY(${raizes})
      UNION ALL
      SELECT n.id, n.url, n.demand_file_id, a.nivel + 1
      FROM drive_nodes n
      JOIN arvore a ON n.parent_id = a.id
      WHERE a.nivel < 40
    )
    SELECT DISTINCT id, url, demand_file_id FROM arvore`;
}

export async function apagarSubarvores(db: Db, raizes: readonly string[]) {
  const nos = await subarvore(db, raizes);
  if (nos.length === 0) return 0;
  const ids = nos.map((no) => no.id);
  const arquivos = nos.map((no) => no.demand_file_id).filter((id): id is string => id != null);
  const cfg = env.armazenamento;
  const chaves = cfg
    ? nos
        .map((no) => (no.url ? chaveDaUrl(no.url, cfg.bucket, cfg.regiao) : null))
        .filter((chave): chave is string => chave != null)
    : [];
  if (chaves.length > 0) await removerObjetos(chaves);
  if (arquivos.length > 0) {
    await db`UPDATE drive_nodes SET demand_file_id = NULL WHERE id = ANY(${ids})`;
    await db`DELETE FROM demand_files WHERE id = ANY(${arquivos})`;
  }
  await db`DELETE FROM drive_nodes WHERE id = ANY(${ids})`;
  return ids.length;
}

export async function expurgarVencidos(sql: Sql, agora: Date): Promise<number> {
  const limite = new Date(agora.getTime() - DIAS * 24 * 60 * 60 * 1000);
  const raizes = await sql<{ id: string }[]>`
    SELECT id FROM drive_nodes
    WHERE deleted_at IS NOT NULL
      AND trash_root_id = id
      AND deleted_at < ${limite}`;
  if (raizes.length === 0) return 0;
  await sql.begin(async (tx) => {
    await apagarSubarvores(tx, raizes.map((raiz) => raiz.id));
  });
  return raizes.length;
}
