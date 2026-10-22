import { db, type Db } from '@/lib/db';

export type EntradaHistorico = {
  id: number;
  demandaId: string | null;
  acao: string;
  usuarioId: string | null;
  usuarioNome: string | null;
  detalhes: string | null;
  criadoEm: Date;
};

type LinhaHistorico = {
  id: string; // bigserial retorna string via postgres.js
  demand_id: string | null;
  action: string;
  user_id: string | null;
  user_name: string | null;
  details: string | null;
  created_at: Date;
};

/** Lista todas as entradas de histórico de uma demanda, ordenadas por created_at DESC. */
export async function listarHistorico(sql: Db, demandaId: string): Promise<EntradaHistorico[]> {
  const linhas = await sql<LinhaHistorico[]>`
    SELECT h.id, h.demand_id, h.action, h.user_id,
           u.name AS user_name, h.details, h.created_at
    FROM history h
    LEFT JOIN users u ON u.id = h.user_id
    WHERE h.demand_id = ${demandaId}
    ORDER BY h.created_at DESC
  `;
  return linhas.map((l) => ({
    id: Number(l.id),
    demandaId: l.demand_id,
    acao: l.action,
    usuarioId: l.user_id,
    usuarioNome: l.user_name,
    detalhes: l.details,
    criadoEm: l.created_at,
  }));
}

/** Versão para páginas — usa db() padrão. */
export async function listarHistoricoDb(demandaId: string): Promise<EntradaHistorico[]> {
  return listarHistorico(db(), demandaId);
}
