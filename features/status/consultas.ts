import 'server-only';
import type postgres from 'postgres';
import { db, type Sql } from '@/lib/db';

export type RelogioAberto = {
  demandaId: string;
  titulo: string;
  versao: number;
  baseMs: number;
  atualizadoEmMs: number;
  pausado: boolean;
};

/**
 * Ciclos ainda abertos. O tempo ativo para no início da pausa em aberto
 * e desconta as pausas já encerradas desde o início do ciclo.
 */
export async function listarRelogiosAbertos(
  sql: Sql,
  escopo: postgres.PendingQuery<postgres.Row[]>,
  limite: number,
): Promise<RelogioAberto[]> {
  const linhas = await sql<
    {
      demanda_id: string;
      titulo: string;
      versao: number;
      decorrido_ms: string | number;
      atualizado_em_ms: string | number;
      pausado: boolean;
    }[]
  >`
    SELECT
      d.id AS demanda_id,
      d.title AS titulo,
      c.version AS versao,
      GREATEST(
        0,
        FLOOR(
          EXTRACT(EPOCH FROM (COALESCE(p.paused_at, now()) - c.started_at)) * 1000
          - COALESCE(pausas.ms, 0)
        )
      )::bigint AS decorrido_ms,
      FLOOR(EXTRACT(EPOCH FROM now()) * 1000)::bigint AS atualizado_em_ms,
      (p.id IS NOT NULL) AS pausado
    FROM editing_cycles c
    JOIN demands d ON d.id = c.demand_id
    LEFT JOIN demand_pauses p
      ON p.demand_id = d.id
     AND p.resumed_at IS NULL
    LEFT JOIN LATERAL (
      SELECT SUM(EXTRACT(EPOCH FROM (dp.resumed_at - dp.paused_at)) * 1000) AS ms
        FROM demand_pauses dp
       WHERE dp.demand_id = c.demand_id
         AND dp.resumed_at IS NOT NULL
         AND dp.paused_at >= c.started_at
    ) pausas ON true
    WHERE c.ended_at IS NULL
      AND ${escopo}
    ORDER BY c.started_at ASC
    LIMIT ${limite}
  `;

  return linhas.map((linha) => ({
    demandaId: linha.demanda_id,
    titulo: linha.titulo,
    versao: linha.versao,
    baseMs: Number(linha.decorrido_ms),
    atualizadoEmMs: Number(linha.atualizado_em_ms),
    pausado: linha.pausado,
  }));
}

export async function lerRelogioDemanda(demandaId: string): Promise<RelogioAberto | null> {
  const sql = db();
  const [relogio] = await listarRelogiosAbertos(
    sql,
    sql`d.deleted_at IS NULL AND d.id = ${demandaId}`,
    1,
  );
  return relogio ?? null;
}
