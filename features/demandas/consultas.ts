import 'server-only';
import { db, type Db } from '@/lib/db';
import { revisaoAtual } from '@/lib/history';
import type { UsuarioSessao } from '@/lib/session';

export type DemandaStatus =
  | 'Não iniciada'
  | 'Em execução'
  | 'Pausada'
  | 'Aprovação'
  | 'Ajustes solicitados'
  | 'Concluída'
  | 'Reprovada'
  | 'Cancelada';

export type DemandaPrioridade = 'Baixa' | 'Normal' | 'Alta' | 'Urgente';

export type Demanda = {
  id: string;
  title: string;
  format: string;
  influencer_id: string | null;
  influencer_nome: string | null;
  editor_id: string | null;
  editor_nome: string | null;
  editor_label: string | null;
  status: DemandaStatus;
  approval_date: string | null;
  post_date: string | null;
  info: string | null;
  link: string | null;
  priority: DemandaPrioridade;
  editorial_line: string | null;
  source_program: string | null;
  clips_count: number | null;
  created_by: string | null;
  created_at: Date;
  completed_at: Date | null;
  updated_at: Date;
  /** Prazo efetivo: post_date → approval_date → null */
  prazo_efetivo: string | null;
  /** Atrasada: prazo_efetivo < hoje E status não é final nem em Aprovação */
  atrasada: boolean;
};

export type FiltrosListarDemandas = {
  periodo?: { inicio: string; fim: string };
  busca?: string;
  editor_id?: string;
};

export type ResumoEditor = {
  editor_id: string;
  editor_nome: string;
  editor_label: string | null;
  total: number;
  em_execucao: number;
  concluidas: number;
  atrasadas: number;
};

const STATUSES_NAO_ATRASADOS = [
  'Concluída',
  'Cancelada',
  'Reprovada',
  'Aprovação',
] as const;

/**
 * Lista Demandas ativas (deleted_at IS NULL), respeitando visibilidade:
 * sem verTodasDemandas → só as do Editor ou do Influencer da sessão.
 */
export async function listarDemandas(
  sql: Db,
  usuario: UsuarioSessao,
  filtros: FiltrosListarDemandas = {},
): Promise<Demanda[]> {
  const podeTudo = usuario.permissoes.verTodasDemandas;

  const linhas = await sql<
    {
      id: string;
      title: string;
      format: string;
      influencer_id: string | null;
      influencer_nome: string | null;
      editor_id: string | null;
      editor_nome: string | null;
      editor_label: string | null;
      status: DemandaStatus;
      approval_date: string | null;
      post_date: string | null;
      info: string | null;
      link: string | null;
      priority: DemandaPrioridade;
      editorial_line: string | null;
      source_program: string | null;
      clips_count: number | null;
      created_by: string | null;
      created_at: Date;
      completed_at: Date | null;
      updated_at: Date;
      prazo_efetivo: string | null;
      atrasada: boolean;
    }[]
  >`
    SELECT
      d.id,
      d.title,
      d.format,
      d.influencer_id,
      u_inf.name                                          AS influencer_nome,
      d.editor_id,
      u_ed.name                                           AS editor_nome,
      u_ed.editor_label,
      d.status,
      d.approval_date::text                               AS approval_date,
      d.post_date::text                                   AS post_date,
      d.info,
      d.link,
      d.priority,
      d.editorial_line,
      d.source_program,
      d.clips_count,
      d.created_by,
      d.created_at,
      d.completed_at,
      d.updated_at,
      COALESCE(d.post_date::text, d.approval_date::text) AS prazo_efetivo,
      (
        COALESCE(d.post_date, d.approval_date) < CURRENT_DATE
        AND d.status NOT IN (${sql.unsafe(STATUSES_NAO_ATRASADOS.map((s) => `'${s}'`).join(','))})
      )                                                   AS atrasada
    FROM demands d
    LEFT JOIN users u_inf ON u_inf.id = d.influencer_id
    LEFT JOIN users u_ed  ON u_ed.id  = d.editor_id
    WHERE d.deleted_at IS NULL
      ${podeTudo ? sql`` : sql`AND (d.editor_id = ${usuario.id} OR d.influencer_id = ${usuario.id})`}
      ${filtros.periodo
        ? sql`AND d.created_at >= ${filtros.periodo.inicio}::date
              AND d.created_at <  (${filtros.periodo.fim}::date + interval '1 day')`
        : sql``}
      ${filtros.busca && filtros.busca.trim()
        ? sql`AND d.title ILIKE ${'%' + filtros.busca.trim() + '%'}`
        : sql``}
      ${filtros.editor_id
        ? sql`AND d.editor_id = ${filtros.editor_id}`
        : sql``}
    ORDER BY
      CASE d.priority
        WHEN 'Urgente' THEN 1
        WHEN 'Alta'    THEN 2
        WHEN 'Normal'  THEN 3
        WHEN 'Baixa'   THEN 4
      END ASC,
      COALESCE(d.post_date, d.approval_date) ASC NULLS LAST,
      d.created_at ASC
  `;

  return linhas;
}

/** Busca uma Demanda por ID (sem deleted_at). Retorna null se não existir ou estiver excluída. */
export async function buscarDemanda(sql: Db, id: string): Promise<Demanda | null> {
  const [linha] = await sql<
    {
      id: string;
      title: string;
      format: string;
      influencer_id: string | null;
      influencer_nome: string | null;
      editor_id: string | null;
      editor_nome: string | null;
      editor_label: string | null;
      status: DemandaStatus;
      approval_date: string | null;
      post_date: string | null;
      info: string | null;
      link: string | null;
      priority: DemandaPrioridade;
      editorial_line: string | null;
      source_program: string | null;
      clips_count: number | null;
      created_by: string | null;
      created_at: Date;
      completed_at: Date | null;
      updated_at: Date;
      prazo_efetivo: string | null;
      atrasada: boolean;
    }[]
  >`
    SELECT
      d.id,
      d.title,
      d.format,
      d.influencer_id,
      u_inf.name                                          AS influencer_nome,
      d.editor_id,
      u_ed.name                                           AS editor_nome,
      u_ed.editor_label,
      d.status,
      d.approval_date::text                               AS approval_date,
      d.post_date::text                                   AS post_date,
      d.info,
      d.link,
      d.priority,
      d.editorial_line,
      d.source_program,
      d.clips_count,
      d.created_by,
      d.created_at,
      d.completed_at,
      d.updated_at,
      COALESCE(d.post_date::text, d.approval_date::text) AS prazo_efetivo,
      (
        COALESCE(d.post_date, d.approval_date) < CURRENT_DATE
        AND d.status NOT IN (${sql.unsafe(STATUSES_NAO_ATRASADOS.map((s) => `'${s}'`).join(','))})
      )                                                   AS atrasada
    FROM demands d
    LEFT JOIN users u_inf ON u_inf.id = d.influencer_id
    LEFT JOIN users u_ed  ON u_ed.id  = d.editor_id
    WHERE d.id = ${id}
      AND d.deleted_at IS NULL
    LIMIT 1
  `;
  return linha ?? null;
}

/**
 * Demandas com formato Ficha técnica sem Editor e não excluídas — Fila de Fichas.
 * Formato Cortes é excluído da Fila (editor padrão atribuído na criação).
 */
export async function listarFilaDeFichas(sql: Db): Promise<Demanda[]> {
  const linhas = await sql<
    {
      id: string;
      title: string;
      format: string;
      influencer_id: string | null;
      influencer_nome: string | null;
      editor_id: string | null;
      editor_nome: string | null;
      editor_label: string | null;
      status: DemandaStatus;
      approval_date: string | null;
      post_date: string | null;
      info: string | null;
      link: string | null;
      priority: DemandaPrioridade;
      editorial_line: string | null;
      source_program: string | null;
      clips_count: number | null;
      created_by: string | null;
      created_at: Date;
      completed_at: Date | null;
      updated_at: Date;
      prazo_efetivo: string | null;
      atrasada: boolean;
    }[]
  >`
    SELECT
      d.id,
      d.title,
      d.format,
      d.influencer_id,
      u_inf.name                                          AS influencer_nome,
      NULL::uuid                                          AS editor_id,
      NULL::text                                          AS editor_nome,
      NULL::text                                          AS editor_label,
      d.status,
      d.approval_date::text                               AS approval_date,
      d.post_date::text                                   AS post_date,
      d.info,
      d.link,
      d.priority,
      d.editorial_line,
      d.source_program,
      d.clips_count,
      d.created_by,
      d.created_at,
      d.completed_at,
      d.updated_at,
      COALESCE(d.post_date::text, d.approval_date::text) AS prazo_efetivo,
      (
        COALESCE(d.post_date, d.approval_date) < CURRENT_DATE
        AND d.status NOT IN (${sql.unsafe(STATUSES_NAO_ATRASADOS.map((s) => `'${s}'`).join(','))})
      )                                                   AS atrasada
    FROM demands d
    LEFT JOIN users u_inf ON u_inf.id = d.influencer_id
    WHERE d.editor_id IS NULL
      AND d.deleted_at IS NULL
      AND d.format <> 'Cortes'
    ORDER BY d.created_at ASC
  `;
  return linhas;
}

// ─── Wrappers para uso em páginas (não precisam receber sql) ────────────────

/** Carrega Demandas para a página — chama db() internamente. */
export async function carregarDemandasPagina(
  usuario: UsuarioSessao,
  filtros: FiltrosListarDemandas = {},
): Promise<Demanda[]> {
  return listarDemandas(db(), usuario, filtros);
}

/** Carrega uma Demanda por ID para a página — chama db() internamente. */
export async function carregarDemandaPagina(id: string): Promise<Demanda | null> {
  return buscarDemanda(db(), id);
}

/** Carrega a Fila de Fichas para a página — chama db() internamente. */
export async function carregarFilaDeFichasPagina(): Promise<Demanda[]> {
  return listarFilaDeFichas(db());
}

/** Carrega formatos para páginas — chama db() internamente. */
export async function carregarFormatosPagina(): Promise<string[]> {
  return listarFormatos(db());
}

/** Carrega editores para páginas — chama db() internamente. */
export async function carregarEditoresPagina(): Promise<{ id: string; nome: string; label: string }[]> {
  return listarEditores(db());
}

/** Carrega influencers para páginas — chama db() internamente. */
export async function carregarInfluencersPagina(): Promise<{ id: string; nome: string }[]> {
  return listarInfluencers(db());
}

/** Carrega resumo por editor para páginas — chama db() internamente. */
export async function carregarResumoPorEditorPagina(): Promise<ResumoEditor[]> {
  return resumoDemandasPorEditor(db());
}

/** Revisão atual do histórico — usada pelo polling de 30 s na página de Demandas. */
export async function carregarRevisaoPagina(): Promise<number> {
  return revisaoAtual(db());
}

// ─────────────────────────────────────────────────────────────────────────────

/** Formatos disponíveis vindos de system_lists. */
export async function listarFormatos(sql: Db): Promise<string[]> {
  const linhas = await sql<{ value: string }[]>`
    SELECT value FROM system_lists WHERE kind = 'formato' AND is_active ORDER BY position, value
  `;
  return linhas.map((l) => l.value);
}

/** Usuários ativos com vínculo de editor (editor_label não nulo). */
export async function listarEditores(sql: Db): Promise<{ id: string; nome: string; label: string }[]> {
  const linhas = await sql<{ id: string; name: string; editor_label: string }[]>`
    SELECT id, name, editor_label FROM users
    WHERE is_active AND editor_label IS NOT NULL
    ORDER BY editor_label
  `;
  return linhas.map((l) => ({ id: l.id, nome: l.name, label: l.editor_label }));
}

/** Influencers ativos (perfil Influencer). */
export async function listarInfluencers(sql: Db): Promise<{ id: string; nome: string }[]> {
  const linhas = await sql<{ id: string; name: string }[]>`
    SELECT id, name FROM users WHERE is_active AND profile = 'Influencer' ORDER BY name
  `;
  return linhas.map((l) => ({ id: l.id, nome: l.name }));
}

/** Resumo de Demandas por Editor para o cabeçalho do Quadro. */
export async function resumoDemandasPorEditor(sql: Db): Promise<ResumoEditor[]> {
  const linhas = await sql<{
    editor_id: string;
    editor_nome: string;
    editor_label: string | null;
    total: number;
    em_execucao: number;
    concluidas: number;
    atrasadas: number;
  }[]>`
    SELECT
      u.id                                          AS editor_id,
      u.name                                        AS editor_nome,
      u.editor_label,
      COUNT(*)::int                                 AS total,
      COUNT(*) FILTER (WHERE d.status = 'Em execução')::int AS em_execucao,
      COUNT(*) FILTER (WHERE d.status = 'Concluída')::int   AS concluidas,
      COUNT(*) FILTER (
        WHERE COALESCE(d.post_date, d.approval_date) < CURRENT_DATE
          AND d.status NOT IN (${sql.unsafe(STATUSES_NAO_ATRASADOS.map((s) => `'${s}'`).join(','))})
      )::int                                        AS atrasadas
    FROM demands d
    JOIN users u ON u.id = d.editor_id
    WHERE d.deleted_at IS NULL
    GROUP BY u.id, u.name, u.editor_label
    ORDER BY u.editor_label, u.name
  `;
  return linhas;
}
