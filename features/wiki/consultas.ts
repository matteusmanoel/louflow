import 'server-only';
import { db, type Db } from '@/lib/db';
import type { Perfil } from '@/lib/permissions';

export type ArtigoWiki = {
  id: string;
  category: string;
  title: string;
  summary: string | null;
  position: number;
  is_published: boolean;
};

export type ArtigoWikiDetalhe = ArtigoWiki & {
  content: string;
  updated_at: string;
};

/** Só o Administrador enxerga rascunhos. O filtro correspondente fica no SQL. */
export function veRascunhosWiki(perfil: Perfil): boolean {
  return perfil === 'Administrador';
}

type LinhaResumo = {
  id: string;
  category: string;
  title: string;
  summary: string | null;
  position: number;
  is_published: boolean;
};

function mapearResumo(linha: LinhaResumo): ArtigoWiki {
  return {
    id: linha.id,
    category: linha.category,
    title: linha.title,
    summary: linha.summary,
    position: Number(linha.position),
    is_published: linha.is_published,
  };
}

/**
 * Lista os artigos na ordem de leitura.
 * Quem não é Administrador recebe só `is_published = true`, filtrado no SQL.
 */
export async function listarArtigosWiki(perfil: Perfil, sqlInjetado?: Db): Promise<ArtigoWiki[]> {
  const sql = sqlInjetado ?? db();
  const linhas = await sql<LinhaResumo[]>`
    SELECT id, category, title, summary, position, is_published
    FROM wiki_articles
    WHERE (${veRascunhosWiki(perfil)} OR is_published)
    ORDER BY position ASC, title ASC
  `;
  return linhas.map(mapearResumo);
}

export async function obterArtigoWiki(
  id: string,
  perfil: Perfil,
  sqlInjetado?: Db,
): Promise<ArtigoWikiDetalhe | null> {
  const sql = sqlInjetado ?? db();
  const [linha] = await sql<(LinhaResumo & { content: string; updated_at: Date | string })[]>`
    SELECT id, category, title, summary, content, position, is_published, updated_at
    FROM wiki_articles
    WHERE id = ${id}
      AND (${veRascunhosWiki(perfil)} OR is_published)
  `;
  if (!linha) return null;
  const atualizado = linha.updated_at instanceof Date ? linha.updated_at.toISOString() : String(linha.updated_at);
  return {
    ...mapearResumo(linha),
    content: linha.content,
    updated_at: atualizado,
  };
}
