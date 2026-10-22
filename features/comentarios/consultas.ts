import { db, type Db } from '@/lib/db';

export type Comentario = {
  id: string;
  demandaId: string;
  autorId: string;
  autorNome: string;
  conteudo: string;
  criadoEm: Date;
};

type LinhaComentario = {
  id: string;
  demand_id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: Date;
};

/** Lista todos os comentários de uma demanda, ordenados por created_at ASC. */
export async function listarComentarios(sql: Db, demandaId: string): Promise<Comentario[]> {
  const linhas = await sql<LinhaComentario[]>`
    SELECT c.id, c.demand_id, c.author_id, u.name AS author_name, c.body, c.created_at
    FROM comments c
    JOIN users u ON u.id = c.author_id
    WHERE c.demand_id = ${demandaId}
    ORDER BY c.created_at ASC
  `;
  return linhas.map((l) => ({
    id: l.id,
    demandaId: l.demand_id,
    autorId: l.author_id,
    autorNome: l.author_name,
    conteudo: l.body,
    criadoEm: l.created_at,
  }));
}

/** Versão para páginas — usa db() padrão. */
export async function listarComentariosDb(demandaId: string): Promise<Comentario[]> {
  return listarComentarios(db(), demandaId);
}
