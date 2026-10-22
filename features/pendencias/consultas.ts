import 'server-only';
import { db } from '@/lib/db';

export type PendenciaListada = {
  id: string;
  titulo: string;
  status: string;
  dataEntrega: Date | null;
  prazoAtrasado: boolean;
};

export type AdiamentoListado = {
  id: number;
  detalhes: string | null;
  criadoEm: Date;
  usuarioNome: string | null;
};

/** Demandas aguardando ação do influencer (status = 'Aprovação'). */
export async function listarPendencias(usuarioId: string): Promise<PendenciaListada[]> {
  const sql = db();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const linhas = await sql<
    {
      id: string;
      title: string;
      status: string;
      post_date: string | null;
      approval_date: string | null;
    }[]
  >`
    SELECT id, title, status, post_date, approval_date
    FROM demands
    WHERE influencer_id = ${usuarioId}
      AND status = 'Aprovação'
      AND deleted_at IS NULL
    ORDER BY COALESCE(post_date, approval_date) ASC NULLS LAST`;

  return linhas.map((r) => {
    const dataEntrega = r.post_date ? new Date(r.post_date) : r.approval_date ? new Date(r.approval_date) : null;
    const prazoAtrasado = dataEntrega != null && dataEntrega < hoje;
    return {
      id: r.id,
      titulo: r.title,
      status: r.status,
      dataEntrega,
      prazoAtrasado,
    };
  });
}

/** Histórico de adiamentos de uma Demanda. */
export async function listarAdiamentos(demandaId: string): Promise<AdiamentoListado[]> {
  const sql = db();

  const linhas = await sql<
    {
      id: string;
      details: string | null;
      created_at: Date;
      user_name: string | null;
    }[]
  >`
    SELECT h.id, h.details, h.created_at, u.name AS user_name
    FROM history h
    LEFT JOIN users u ON u.id = h.user_id
    WHERE h.demand_id = ${demandaId}
      AND (h.action = 'adiamento' OR h.action LIKE '%adiamento%')
    ORDER BY h.created_at ASC`;

  return linhas.map((r) => ({
    id: Number(r.id),
    detalhes: r.details,
    criadoEm: r.created_at,
    usuarioNome: r.user_name,
  }));
}
