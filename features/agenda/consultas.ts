import { db, type Db } from '@/lib/db';
import type { UsuarioSessao } from '@/lib/session';

export type DemandaAgenda = {
  id: string;
  titulo: string;
  formato: string;
  status: string;
  prioridade: string;
  postDate: Date;
  influencerId: string | null;
  influencerNome: string | null;
  editorId: string | null;
  editorNome: string | null;
};

type LinhaAgenda = {
  id: string;
  title: string;
  format: string;
  status: string;
  priority: string;
  post_date: Date;
  influencer_id: string | null;
  influencer_nome: string | null;
  editor_id: string | null;
  editor_nome: string | null;
};

function mapear(linha: LinhaAgenda): DemandaAgenda {
  return {
    id: linha.id,
    titulo: linha.title,
    formato: linha.format,
    status: linha.status,
    prioridade: linha.priority,
    postDate: linha.post_date,
    influencerId: linha.influencer_id,
    influencerNome: linha.influencer_nome,
    editorId: linha.editor_id,
    editorNome: linha.editor_nome,
  };
}

/**
 * Retorna as demandas com post_date no mês/ano informados.
 * Respeita visibilidade: verTodasDemandas retorna tudo, caso contrário só as próprias.
 */
export async function listarAgendaDb(
  { mes, ano }: { mes: number; ano: number },
  usuario: UsuarioSessao,
  sql: Db = db(),
): Promise<DemandaAgenda[]> {
  const dataInicio = new Date(ano, mes - 1, 1);
  const dataFim = new Date(ano, mes, 1); // primeiro dia do mês seguinte (exclusivo)

  const linhas = await (usuario.permissoes.verTodasDemandas
    ? sql<LinhaAgenda[]>`
        SELECT
          d.id, d.title, d.format, d.status, d.priority, d.post_date,
          inf.id   AS influencer_id, inf.name  AS influencer_nome,
          ed.id    AS editor_id,    ed.name    AS editor_nome
        FROM demands d
        LEFT JOIN users inf ON inf.id = d.influencer_id
        LEFT JOIN users ed  ON ed.id  = d.editor_id
        WHERE d.post_date >= ${dataInicio}::date
          AND d.post_date <  ${dataFim}::date
          AND d.deleted_at IS NULL
        ORDER BY d.post_date, d.created_at`
    : sql<LinhaAgenda[]>`
        SELECT
          d.id, d.title, d.format, d.status, d.priority, d.post_date,
          inf.id   AS influencer_id, inf.name  AS influencer_nome,
          ed.id    AS editor_id,    ed.name    AS editor_nome
        FROM demands d
        LEFT JOIN users inf ON inf.id = d.influencer_id
        LEFT JOIN users ed  ON ed.id  = d.editor_id
        WHERE d.post_date >= ${dataInicio}::date
          AND d.post_date <  ${dataFim}::date
          AND d.deleted_at IS NULL
          AND (d.influencer_id = ${usuario.id} OR d.editor_id = ${usuario.id} OR d.created_by = ${usuario.id})
        ORDER BY d.post_date, d.created_at`);

  return linhas.map(mapear);
}
