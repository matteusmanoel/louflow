import 'server-only';
import { db } from '@/lib/db';

export type DemandaLixeira = {
  id: string;
  title: string;
  format: string;
  status: string;
  deleted_at: Date;
  deleted_by: string | null;
  deletado_por_nome: string | null;
};

/** Lista demandas na lixeira (deleted_at IS NOT NULL). Requer verLixeira. */
export async function listarLixeira(): Promise<DemandaLixeira[]> {
  return db()<DemandaLixeira[]>`
    SELECT
      d.id,
      d.title,
      d.format,
      d.status::text,
      COALESCE(dt.deleted_at, d.deleted_at) AS deleted_at,
      dt.deleted_by::text,
      u.name AS deletado_por_nome
    FROM demands d
    LEFT JOIN demand_trash dt ON dt.demand_id = d.id
    LEFT JOIN users u ON u.id = dt.deleted_by
    WHERE d.deleted_at IS NOT NULL
    ORDER BY COALESCE(dt.deleted_at, d.deleted_at) DESC
  `;
}
