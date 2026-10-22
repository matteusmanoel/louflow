import { db } from '@/lib/db';

export type Corte = {
  id: string;
  titulo: string;
  influencerId: string | null;
  influencerNome: string | null;
  editorId: string;
  editorNome: string;
  dataPostagem: string;
  linhaEditorial: string;
  linkVideo: string | null;
  programaOrigem: string;
  status: string;
  quantidadeProduzida: number | null;
  criadoEm: Date;
  concluidoEm: Date | null;
};

/** Lista todos os Cortes, ordenados por data de postagem descendente. */
export async function listarCortes(): Promise<Corte[]> {
  const sql = db();
  const linhas = await sql<
    {
      id: string;
      title: string;
      influencer_id: string | null;
      influencer_nome: string | null;
      editor_id: string;
      editor_nome: string;
      post_date: Date;
      editorial_line: string;
      video_link: string | null;
      source_program: string;
      status: string;
      clips_count: number | null;
      created_at: Date;
      completed_at: Date | null;
    }[]
  >`
    SELECT
      c.id,
      c.title,
      c.influencer_id,
      i.name AS influencer_nome,
      c.editor_id,
      e.name AS editor_nome,
      c.post_date,
      c.editorial_line,
      c.video_link,
      c.source_program,
      c.status,
      c.clips_count,
      c.created_at,
      c.completed_at
    FROM clips c
    JOIN users e ON e.id = c.editor_id
    LEFT JOIN users i ON i.id = c.influencer_id
    ORDER BY c.post_date DESC, c.created_at DESC
  `;

  return linhas.map((l) => ({
    id: l.id,
    titulo: l.title,
    influencerId: l.influencer_id,
    influencerNome: l.influencer_nome,
    editorId: l.editor_id,
    editorNome: l.editor_nome,
    dataPostagem: l.post_date instanceof Date ? l.post_date.toISOString().slice(0, 10) : String(l.post_date),
    linhaEditorial: l.editorial_line,
    linkVideo: l.video_link,
    programaOrigem: l.source_program,
    status: l.status,
    quantidadeProduzida: l.clips_count,
    criadoEm: l.created_at,
    concluidoEm: l.completed_at,
  }));
}
