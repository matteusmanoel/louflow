import 'server-only';
import type postgres from 'postgres';
import { db, type Sql } from '@/lib/db';
import type { DemandaPrioridade, DemandaStatus } from '@/features/demandas/consultas';
import type { UsuarioSessao } from '@/lib/session';

/** Amostra curta no painel do administrador. */
const LIMITE_AMOSTRA = 6;
/** Listas do editor e do influencer no painel. */
const LIMITE_LISTA = 40;

export type ContadoresAdministrador = {
  total: number;
  atrasadas: number;
  emAprovacao: number;
  pendencias: number;
};

export type DemandaResumo = {
  id: string;
  titulo: string;
  status: DemandaStatus;
  prioridade: DemandaPrioridade;
  prazo: string | null;
  editorNome: string | null;
  influencerNome: string | null;
  atrasada: boolean;
};

export type CicloAberto = {
  demandaId: string;
  titulo: string;
  decorridoMs: number;
  pausado: boolean;
};

export type EntregaAguardando = {
  id: string;
  demandaId: string;
  titulo: string;
  editorNome: string | null;
  versao: number;
  entregueEm: Date;
};

export type PendenciaAgenda = {
  id: string;
  demandaId: string;
  titulo: string;
};

export type PostagemAgendada = {
  id: string;
  titulo: string;
  plataforma: string;
  quando: Date;
};

export type VisaoAdministrador = {
  perfil: 'Administrador';
  contadores: ContadoresAdministrador;
  atrasadas: DemandaResumo[];
  aprovacoes: DemandaResumo[];
};

export type VisaoEditor = {
  perfil: 'Editor';
  demandas: DemandaResumo[];
  ciclos: CicloAberto[];
  entregas: EntregaAguardando[];
};

export type VisaoInfluencer = {
  perfil: 'Influencer';
  demandas: DemandaResumo[];
  pendencias: PendenciaAgenda[];
  agendamentos: PostagemAgendada[];
};

export type VisaoDashboard = VisaoAdministrador | VisaoEditor | VisaoInfluencer;

type LinhaDemanda = {
  id: string;
  title: string;
  status: DemandaStatus;
  priority: DemandaPrioridade;
  prazo: string | null;
  editor_nome: string | null;
  influencer_nome: string | null;
  atrasada: boolean;
};

/**
 * Atrasada, igual ao quadro: não excluída, fora dos status finais e de Aprovação,
 * com prazo efetivo (postagem, senão aprovação) anterior ao dia em São Paulo.
 */
function exprAtrasada(sql: Sql) {
  return sql`
    d.deleted_at IS NULL
    AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
    AND COALESCE(d.post_date, d.approval_date) < (now() AT TIME ZONE 'America/Sao_Paulo')::date
  `;
}

function selecaoDemanda(sql: Sql) {
  const atrasada = exprAtrasada(sql);
  return sql`
    d.id,
    d.title,
    d.status,
    d.priority,
    COALESCE(d.post_date::text, d.approval_date::text) AS prazo,
    u_ed.name AS editor_nome,
    u_inf.name AS influencer_nome,
    (${atrasada}) AS atrasada
  `;
}

function mapDemanda(linha: LinhaDemanda): DemandaResumo {
  return {
    id: linha.id,
    titulo: linha.title,
    status: linha.status,
    prioridade: linha.priority,
    prazo: linha.prazo,
    editorNome: linha.editor_nome,
    influencerNome: linha.influencer_nome,
    atrasada: linha.atrasada,
  };
}

/** Demandas do editor e dos editores para os quais ele aprova. */
function escopoEditor(sql: Sql, usuarioId: string) {
  return sql`
    d.deleted_at IS NULL
    AND (
      d.editor_id = ${usuarioId}
      OR d.editor_id IN (
        SELECT ad.editor_id
        FROM approval_delegations ad
        WHERE ad.approver_id = ${usuarioId}
      )
    )
  `;
}

async function listarDemandas(
  sql: Sql,
  onde: postgres.PendingQuery<postgres.Row[]>,
  limite: number,
): Promise<DemandaResumo[]> {
  const linhas = await sql<LinhaDemanda[]>`
    SELECT ${selecaoDemanda(sql)}
    FROM demands d
    LEFT JOIN users u_ed ON u_ed.id = d.editor_id
    LEFT JOIN users u_inf ON u_inf.id = d.influencer_id
    WHERE ${onde}
    ORDER BY
      CASE WHEN (${exprAtrasada(sql)}) THEN 0 ELSE 1 END,
      COALESCE(d.post_date, d.approval_date) ASC NULLS LAST,
      d.created_at DESC
    LIMIT ${limite}
  `;
  return linhas.map(mapDemanda);
}

async function carregarAdministrador(): Promise<VisaoAdministrador> {
  const sql = db();
  const atrasada = exprAtrasada(sql);
  const [contagem, atrasadas, aprovacoes] = await Promise.all([
    sql<{ total: number; atrasadas: number; em_aprovacao: number; pendencias: number }[]>`
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS total,
        COUNT(*) FILTER (WHERE
          deleted_at IS NULL
          AND status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
          AND COALESCE(post_date, approval_date) < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        )::int AS atrasadas,
        COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'Aprovação')::int AS em_aprovacao,
        (SELECT COUNT(*)::int FROM mandatory_schedules WHERE status = 'Pendente') AS pendencias
      FROM demands
    `,
    listarDemandas(sql, atrasada, LIMITE_AMOSTRA),
    listarDemandas(
      sql,
      sql`d.deleted_at IS NULL AND d.status = 'Aprovação'`,
      LIMITE_AMOSTRA,
    ),
  ]);
  const linha = contagem[0];
  return {
    perfil: 'Administrador',
    contadores: {
      total: Number(linha?.total ?? 0),
      atrasadas: Number(linha?.atrasadas ?? 0),
      emAprovacao: Number(linha?.em_aprovacao ?? 0),
      pendencias: Number(linha?.pendencias ?? 0),
    },
    atrasadas,
    aprovacoes,
  };
}

async function carregarEditor(usuarioId: string): Promise<VisaoEditor> {
  const sql = db();
  const escopo = escopoEditor(sql, usuarioId);
  const [demandas, ciclos, entregas] = await Promise.all([
    listarDemandas(sql, escopo, LIMITE_LISTA),
    sql<{ demanda_id: string; titulo: string; decorrido_ms: string | number; pausado: boolean }[]>`
      SELECT
        d.id AS demanda_id,
        d.title AS titulo,
        GREATEST(
          0,
          FLOOR(
            EXTRACT(EPOCH FROM (now() - c.started_at)) * 1000
            - COALESCE(EXTRACT(EPOCH FROM (now() - p.paused_at)) * 1000, 0)
          )
        )::bigint AS decorrido_ms,
        (p.id IS NOT NULL) AS pausado
      FROM editing_cycles c
      JOIN demands d ON d.id = c.demand_id
      LEFT JOIN demand_pauses p
        ON p.demand_id = d.id
       AND p.resumed_at IS NULL
      WHERE c.ended_at IS NULL
        AND ${escopo}
      ORDER BY c.started_at ASC
      LIMIT ${LIMITE_LISTA}
    `,
    sql<{
      id: string;
      demand_id: string;
      titulo: string;
      editor_nome: string | null;
      version: number;
      delivered_at: Date;
    }[]>`
      SELECT
        e.id,
        e.demand_id,
        d.title AS titulo,
        u.name AS editor_nome,
        e.version,
        e.delivered_at
      FROM deliveries e
      JOIN demands d ON d.id = e.demand_id
      LEFT JOIN users u ON u.id = d.editor_id
      WHERE e.status = 'Aguardando aprovação'
        AND d.deleted_at IS NULL
        AND d.editor_id IN (
          SELECT ad.editor_id
          FROM approval_delegations ad
          WHERE ad.approver_id = ${usuarioId}
        )
      ORDER BY e.delivered_at ASC
      LIMIT ${LIMITE_LISTA}
    `,
  ]);

  return {
    perfil: 'Editor',
    demandas,
    ciclos: ciclos.map((c) => ({
      demandaId: c.demanda_id,
      titulo: c.titulo,
      decorridoMs: Number(c.decorrido_ms),
      pausado: c.pausado,
    })),
    entregas: entregas.map((e) => ({
      id: e.id,
      demandaId: e.demand_id,
      titulo: e.titulo,
      editorNome: e.editor_nome,
      versao: e.version,
      entregueEm: e.delivered_at,
    })),
  };
}

async function carregarInfluencer(usuarioId: string): Promise<VisaoInfluencer> {
  const sql = db();
  const [demandas, pendencias, agendamentos] = await Promise.all([
    listarDemandas(sql, sql`d.deleted_at IS NULL AND d.influencer_id = ${usuarioId}`, LIMITE_LISTA),
    sql<{ id: string; demand_id: string; title: string }[]>`
      SELECT id, demand_id, title
      FROM mandatory_schedules
      WHERE influencer_id = ${usuarioId}
        AND status = 'Pendente'
      ORDER BY created_at ASC
      LIMIT ${LIMITE_LISTA}
    `,
    sql<{ id: string; title: string; platform: string; scheduled_at: Date }[]>`
      SELECT id, title, platform, scheduled_at
      FROM post_schedules
      WHERE influencer_id = ${usuarioId}
        AND status = 'Agendada'
      ORDER BY scheduled_at ASC
      LIMIT ${LIMITE_LISTA}
    `,
  ]);

  return {
    perfil: 'Influencer',
    demandas,
    pendencias: pendencias.map((p) => ({
      id: p.id,
      demandaId: p.demand_id,
      titulo: p.title,
    })),
    agendamentos: agendamentos.map((a) => ({
      id: a.id,
      titulo: a.title,
      plataforma: a.platform,
      quando: a.scheduled_at,
    })),
  };
}

/** Visão do dashboard conforme o perfil da sessão. */
export async function carregarDashboard(usuario: UsuarioSessao): Promise<VisaoDashboard> {
  if (usuario.perfil === 'Administrador') return carregarAdministrador();
  if (usuario.perfil === 'Influencer') return carregarInfluencer(usuario.id);
  return carregarEditor(usuario.id);
}
