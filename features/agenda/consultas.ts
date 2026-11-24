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

export type PublicacaoAgenda = {
  id: string;
  dia: number;
  titulo: string;
  status: string;
  formato: string | null;
  horario: string;
  conta: string | null;
  marca: string;
  demandaId: string | null;
};

function intervaloMes(ano: number, mes: number) {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const fim = `${proximoAno}-${String(proximoMes).padStart(2, '0')}-01`;
  return { inicio, fim };
}

/** Publicações gravadas em post_schedules, no fuso de Brasília. */
export async function listarPublicacoesAgenda(
  { mes, ano }: { mes: number; ano: number },
  usuario: UsuarioSessao,
  sql: Db = db(),
): Promise<PublicacaoAgenda[]> {
  const { inicio, fim } = intervaloMes(ano, mes);
  const linhas = await sql<{
    id: string;
    dia: number;
    title: string;
    status: string;
    media_kind: string | null;
    horario: string;
    username: string | null;
    brand: string;
    demand_id: string | null;
  }[]>`
    SELECT ps.id,
           EXTRACT(DAY FROM ps.scheduled_at AT TIME ZONE 'America/Sao_Paulo')::int AS dia,
           ps.title, ps.status, ps.media_kind, ps.brand, ps.demand_id,
           to_char(ps.scheduled_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') AS horario,
           ia.username
    FROM post_schedules ps
    LEFT JOIN instagram_accounts ia ON ia.id = ps.instagram_account_id
    LEFT JOIN demands d ON d.id = ps.demand_id
    WHERE ps.status <> 'Cancelada'
      AND (ps.scheduled_at AT TIME ZONE 'America/Sao_Paulo')::date >= ${inicio}::date
      AND (ps.scheduled_at AT TIME ZONE 'America/Sao_Paulo')::date < ${fim}::date
      ${
        usuario.permissoes.verTodasDemandas
          ? sql``
          : sql`AND (
              ps.influencer_id = ${usuario.id}
              OR ps.scheduled_by = ${usuario.id}
              OR d.influencer_id = ${usuario.id}
              OR d.editor_id = ${usuario.id}
              OR d.created_by = ${usuario.id}
            )`
      }
    ORDER BY ps.scheduled_at, ps.id`;

  return linhas.map((linha) => ({
    id: linha.id,
    dia: Number(linha.dia),
    titulo: linha.title,
    status: linha.status,
    formato: linha.media_kind,
    horario: linha.horario,
    conta: linha.username,
    marca: linha.brand,
    demandaId: linha.demand_id,
  }));
}
