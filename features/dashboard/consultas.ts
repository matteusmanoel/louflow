import 'server-only';
import type postgres from 'postgres';
import { db, type Sql } from '@/lib/db';
import type { DemandaPrioridade, DemandaStatus } from '@/features/demandas/consultas';
import { listarRelogiosAbertos } from '@/features/status/consultas';
import { disponibilidadeCarga } from '@/features/tv/nota';
import type { UsuarioSessao } from '@/lib/session';

/** Amostra curta no painel do administrador. */
const LIMITE_AMOSTRA = 6;
/** Listas do editor e do influencer no painel. */
const LIMITE_LISTA = 40;
const DIAS_SERIE = 14;

export type ContadoresAdministrador = {
  total: number;
  atrasadas: number;
  emAprovacao: number;
  pendencias: number;
};

export type ChaveIndicador =
  | 'aguardandoEditor'
  | 'emProducao'
  | 'atrasadas'
  | 'aguardandoAprovacao'
  | 'tarefasAtuais'
  | 'proximosPrazos'
  | 'concluidas';

export type Indicador = {
  chave: ChaveIndicador;
  rotulo: string;
  valor: number;
};

export type NivelPrazo = 'atrasada' | 'hoje' | 'amanha' | 'dois-dias';

export type AlertaPrazo = {
  id: string;
  titulo: string;
  editorNome: string | null;
  status: DemandaStatus;
  prazo: string;
  diasParaPrazo: number;
  nivel: NivelPrazo;
  textoPrazo: string;
};

export type RelogioCard = {
  decorridoMs: number;
  atualizadoEmMs: number;
  pausado: boolean;
  versao: number;
};

export type PrioridadePainel = {
  id: string;
  titulo: string;
  status: DemandaStatus;
  prioridade: DemandaPrioridade;
  prazo: string | null;
  editorId: string | null;
  editorNome: string | null;
  formato: string;
  atrasada: boolean;
  relogio: RelogioCard | null;
  ultimoAjuste: string | null;
  versaoAjuste: number | null;
};

export type CargaEditorPainel = {
  editorId: string;
  nome: string;
  abertas: number;
  cortesEmAndamento: number;
  atrasadas: number;
  tempoMedioHoras: number | null;
  disponibilidade: string;
  staff: boolean;
};

export type AlertaSaude = { id: string; titulo: string; tipo: string };
export type TempoFormato = { formato: string; horas: number };

export type SaudeOperacao = {
  paradas: number;
  editoresSobrecarregados: number;
  aprovacoes24h: number;
  ajustesRecorrentes: number;
  alertas: AlertaSaude[];
  formatos: TempoFormato[];
};

export type ItemFila = {
  id: string;
  titulo: string;
  formato: string;
  influencerNome: string | null;
  prioridade: DemandaPrioridade;
  atrasada: boolean;
  prazo: string | null;
  editorSugerido: string | null;
};

export type PontoDia = { dia: string; quantidade: number };

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
  atualizadoEmMs: number;
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

type BaseVisao = {
  titulo: string;
  indicadores: Indicador[];
  alertasPrazo: AlertaPrazo[];
  prioridades: PrioridadePainel[];
};

export type VisaoAdministrador = BaseVisao & {
  perfil: 'Administrador';
  contadores: ContadoresAdministrador;
  atrasadas: DemandaResumo[];
  aprovacoes: DemandaResumo[];
  carga: CargaEditorPainel[];
  saude: SaudeOperacao | null;
  concluidas14: PontoDia[];
};

export type VisaoEditor = BaseVisao & {
  perfil: 'Editor';
  demandas: DemandaResumo[];
  ciclos: CicloAberto[];
  entregas: EntregaAguardando[];
  fila: ItemFila[];
  ocupadas: number;
};

export type VisaoInfluencer = BaseVisao & {
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

type LinhaPrioridade = {
  id: string;
  title: string;
  status: DemandaStatus;
  priority: DemandaPrioridade;
  format: string;
  editor_id: string | null;
  prazo: string | null;
  editor_nome: string | null;
  atrasada: boolean;
};

export function rotularPrazo(dias: number): { nivel: NivelPrazo; textoPrazo: string } {
  if (dias < 0) {
    const atraso = Math.abs(dias);
    return {
      nivel: 'atrasada',
      textoPrazo: `ATRASADA HÁ ${atraso} ${atraso === 1 ? 'DIA' : 'DIAS'}`,
    };
  }
  if (dias === 0) return { nivel: 'hoje', textoPrazo: 'VENCE HOJE' };
  if (dias === 1) return { nivel: 'amanha', textoPrazo: 'VENCE AMANHÃ' };
  return { nivel: 'dois-dias', textoPrazo: `VENCE EM ${dias} DIAS` };
}

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

async function listarAlertas(
  sql: Sql,
  onde: postgres.PendingQuery<postgres.Row[]>,
): Promise<AlertaPrazo[]> {
  const linhas = await sql<
    {
      id: string;
      title: string;
      status: DemandaStatus;
      editor_nome: string | null;
      prazo: string;
      dias: number;
    }[]
  >`
    SELECT
      d.id,
      d.title,
      d.status,
      u.name AS editor_nome,
      COALESCE(d.post_date, d.approval_date)::text AS prazo,
      (COALESCE(d.post_date, d.approval_date) - (now() AT TIME ZONE 'America/Sao_Paulo')::date)::int AS dias
    FROM demands d
    LEFT JOIN users u ON u.id = d.editor_id
    WHERE ${onde}
      AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
      AND COALESCE(d.post_date, d.approval_date) IS NOT NULL
      AND (COALESCE(d.post_date, d.approval_date) - (now() AT TIME ZONE 'America/Sao_Paulo')::date) <= 2
    ORDER BY dias ASC, d.title ASC
    LIMIT ${LIMITE_LISTA}
  `;
  return linhas.map((linha) => {
    const dias = Number(linha.dias);
    return {
      id: linha.id,
      titulo: linha.title,
      editorNome: linha.editor_nome,
      status: linha.status,
      prazo: linha.prazo,
      diasParaPrazo: dias,
      ...rotularPrazo(dias),
    };
  });
}

async function enriquecerPrioridades(sql: Sql, linhas: LinhaPrioridade[]): Promise<PrioridadePainel[]> {
  if (linhas.length === 0) return [];
  const ids = linhas.map((linha) => linha.id);
  const [relogios, ajustes] = await Promise.all([
    listarRelogiosAbertos(sql, sql`d.deleted_at IS NULL AND d.id = ANY(${ids})`, ids.length),
    sql<{ demand_id: string; reason: string | null; version: number }[]>`
      SELECT DISTINCT ON (demand_id) demand_id, reason, version
      FROM deliveries
      WHERE demand_id = ANY(${ids})
        AND status = 'Ajustes solicitados'
      ORDER BY demand_id, version DESC
    `,
  ]);
  const porRelogio = new Map(relogios.map((relogio) => [relogio.demandaId, relogio]));
  const porAjuste = new Map(ajustes.map((ajuste) => [ajuste.demand_id, ajuste]));
  return linhas.map((linha) => {
    const relogio = linha.status === 'Em execução' ? porRelogio.get(linha.id) : undefined;
    const ajuste = porAjuste.get(linha.id);
    return {
      id: linha.id,
      titulo: linha.title,
      status: linha.status,
      prioridade: linha.priority,
      prazo: linha.prazo,
      editorId: linha.editor_id,
      editorNome: linha.editor_nome,
      formato: linha.format,
      atrasada: linha.atrasada,
      relogio: relogio
        ? {
            decorridoMs: relogio.baseMs,
            atualizadoEmMs: relogio.atualizadoEmMs,
            pausado: relogio.pausado,
            versao: relogio.versao,
          }
        : null,
      ultimoAjuste: ajuste?.reason ?? null,
      versaoAjuste: ajuste ? Number(ajuste.version) : null,
    };
  });
}

async function listarPrioridades(
  sql: Sql,
  onde: postgres.PendingQuery<postgres.Row[]>,
): Promise<PrioridadePainel[]> {
  const atrasada = exprAtrasada(sql);
  const linhas = await sql<LinhaPrioridade[]>`
    SELECT
      d.id,
      d.title,
      d.status,
      d.priority,
      d.format,
      d.editor_id,
      COALESCE(d.post_date::text, d.approval_date::text) AS prazo,
      u.name AS editor_nome,
      (${atrasada}) AS atrasada
    FROM demands d
    LEFT JOIN users u ON u.id = d.editor_id
    WHERE ${onde}
    ORDER BY COALESCE(d.post_date, d.approval_date) ASC NULLS LAST, d.created_at ASC
    LIMIT ${LIMITE_LISTA}
  `;
  return enriquecerPrioridades(sql, linhas);
}

async function listarCarga(sql: Sql): Promise<CargaEditorPainel[]> {
  const linhas = await sql<
    {
      id: string;
      nome: string;
      staff: boolean;
      abertas: number;
      cortes: number;
      atrasadas: number;
      media_ms: string | number | null;
    }[]
  >`
    WITH pessoas AS (
      SELECT
        u.id,
        u.name,
        EXISTS (
          SELECT 1
          FROM user_permissions p
          WHERE p.user_id = u.id
            AND p.permission_key = 'notaInformativaRanking'
            AND p.granted
        ) AS staff
      FROM users u
      WHERE u.is_active
        AND (
          u.profile = 'Editor'
          OR EXISTS (
            SELECT 1
            FROM user_permissions p
            WHERE p.user_id = u.id
              AND p.permission_key = 'notaInformativaRanking'
              AND p.granted
          )
        )
    ),
    abertas AS (
      SELECT
        d.editor_id,
        COUNT(*) FILTER (
          WHERE d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada')
        )::int AS abertas,
        COUNT(*) FILTER (
          WHERE d.format = 'Cortes'
            AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada')
        )::int AS cortes,
        COUNT(*) FILTER (
          WHERE d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
            AND COALESCE(d.post_date, d.approval_date) < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        )::int AS atrasadas
      FROM demands d
      WHERE d.deleted_at IS NULL
        AND d.editor_id IS NOT NULL
      GROUP BY d.editor_id
    ),
    tempos AS (
      SELECT c.editor_id, AVG(c.active_ms) AS media_ms
      FROM editing_cycles c
      WHERE c.status = 'Concluído'
        AND c.active_ms IS NOT NULL
        AND c.active_ms > 0
      GROUP BY c.editor_id
    )
    SELECT
      pessoas.id,
      pessoas.name AS nome,
      pessoas.staff,
      COALESCE(abertas.abertas, 0)::int AS abertas,
      COALESCE(abertas.cortes, 0)::int AS cortes,
      COALESCE(abertas.atrasadas, 0)::int AS atrasadas,
      tempos.media_ms
    FROM pessoas
    LEFT JOIN abertas ON abertas.editor_id = pessoas.id
    LEFT JOIN tempos ON tempos.editor_id = pessoas.id
    WHERE COALESCE(abertas.abertas, 0) > 0
       OR tempos.media_ms IS NOT NULL
    ORDER BY COALESCE(abertas.abertas, 0) ASC, pessoas.name ASC
  `;
  return linhas.map((linha) => {
    const abertas = Number(linha.abertas);
    const cortesEmAndamento = Number(linha.cortes);
    const media = linha.media_ms == null ? null : Number(linha.media_ms);
    return {
      editorId: linha.id,
      nome: linha.nome,
      abertas,
      cortesEmAndamento,
      atrasadas: Number(linha.atrasadas),
      tempoMedioHoras: media == null ? null : Math.round((media / 3_600_000) * 10) / 10,
      disponibilidade: disponibilidadeCarga({ abertas, cortesEmAndamento }),
      staff: linha.staff,
    };
  });
}

async function carregarSaude(sql: Sql, carga: CargaEditorPainel[]): Promise<SaudeOperacao> {
  const [paradas, aprovacoes, ajustes, formatos] = await Promise.all([
    sql<{ id: string; title: string }[]>`
      SELECT id, title
      FROM demands
      WHERE deleted_at IS NULL
        AND status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Pausada', 'Aprovação')
        AND created_at < now() - interval '3 days'
      ORDER BY created_at ASC
      LIMIT 4
    `,
    sql<{ id: string; title: string }[]>`
      SELECT d.id, d.title
      FROM demands d
      WHERE d.deleted_at IS NULL
        AND d.status = 'Aprovação'
        AND COALESCE(
          (
            SELECT MIN(e.delivered_at)
            FROM deliveries e
            WHERE e.demand_id = d.id
              AND e.status = 'Aguardando aprovação'
          ),
          d.updated_at
        ) < now() - interval '24 hours'
      ORDER BY d.updated_at ASC
      LIMIT 4
    `,
    sql<{ total: number }[]>`
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT e.demand_id
        FROM deliveries e
        JOIN demands d ON d.id = e.demand_id
        WHERE d.deleted_at IS NULL
          AND e.status = 'Ajustes solicitados'
        GROUP BY e.demand_id
        HAVING COUNT(*) >= 2
      ) recorrentes
    `,
    sql<{ formato: string; horas: string | number }[]>`
      SELECT
        d.format AS formato,
        ROUND(AVG(c.active_ms) / 3600000.0, 1) AS horas
      FROM editing_cycles c
      JOIN demands d ON d.id = c.demand_id
      WHERE c.status = 'Concluído'
        AND c.active_ms IS NOT NULL
        AND c.active_ms > 0
        AND d.deleted_at IS NULL
      GROUP BY d.format
      ORDER BY horas DESC, d.format ASC
      LIMIT 5
    `,
  ]);
  const [totalParadas] = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
    FROM demands
    WHERE deleted_at IS NULL
      AND status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Pausada', 'Aprovação')
      AND created_at < now() - interval '3 days'
  `;
  const [totalAprovacoes] = await sql<{ total: number }[]>`
    SELECT COUNT(*)::int AS total
    FROM demands d
    WHERE d.deleted_at IS NULL
      AND d.status = 'Aprovação'
      AND COALESCE(
        (
          SELECT MIN(e.delivered_at)
          FROM deliveries e
          WHERE e.demand_id = d.id
            AND e.status = 'Aguardando aprovação'
        ),
        d.updated_at
      ) < now() - interval '24 hours'
  `;
  return {
    paradas: Number(totalParadas?.total ?? 0),
    editoresSobrecarregados: carga.filter((item) => item.abertas >= 6 || item.atrasadas >= 2).length,
    aprovacoes24h: Number(totalAprovacoes?.total ?? 0),
    ajustesRecorrentes: Number(ajustes[0]?.total ?? 0),
    alertas: [
      ...paradas.map((item) => ({ id: item.id, titulo: item.title, tipo: 'Parada há mais de 3 dias' })),
      ...aprovacoes.map((item) => ({ id: item.id, titulo: item.title, tipo: 'Aprovação há mais de 24h' })),
    ],
    formatos: formatos.map((item) => ({ formato: item.formato, horas: Number(item.horas) })),
  };
}

async function listarConcluidas14(sql: Sql): Promise<PontoDia[]> {
  const linhas = await sql<{ dia: string; quantidade: number }[]>`
    SELECT
      (completed_at AT TIME ZONE 'America/Sao_Paulo')::date::text AS dia,
      COUNT(*)::int AS quantidade
    FROM demands
    WHERE deleted_at IS NULL
      AND status = 'Concluída'
      AND completed_at IS NOT NULL
      AND (completed_at AT TIME ZONE 'America/Sao_Paulo')::date
          >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - (${DIAS_SERIE - 1} * interval '1 day'))
    GROUP BY 1
  `;
  const porDia = new Map(linhas.map((linha) => [linha.dia, Number(linha.quantidade)]));
  const [hoje] = await sql<{ dia: string }[]>`
    SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date::text AS dia
  `;
  const fim = hoje?.dia ?? linhas[0]?.dia;
  if (!fim) return [];
  const pontos: PontoDia[] = [];
  const cursor = new Date(`${fim}T12:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() - (DIAS_SERIE - 1));
  for (let i = 0; i < DIAS_SERIE; i += 1) {
    const dia = cursor.toISOString().slice(0, 10);
    pontos.push({ dia, quantidade: porDia.get(dia) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return pontos;
}

async function listarFila(sql: Sql): Promise<ItemFila[]> {
  const atrasada = exprAtrasada(sql);
  const linhas = await sql<
    {
      id: string;
      title: string;
      format: string;
      influencer_nome: string | null;
      priority: DemandaPrioridade;
      atrasada: boolean;
      prazo: string | null;
      sugerido: string | null;
    }[]
  >`
    SELECT
      d.id,
      d.title,
      d.format,
      u_inf.name AS influencer_nome,
      d.priority,
      (${atrasada}) AS atrasada,
      COALESCE(d.post_date::text, d.approval_date::text) AS prazo,
      u_sug.name AS sugerido
    FROM demands d
    LEFT JOIN users u_inf ON u_inf.id = d.influencer_id
    LEFT JOIN technical_sheets ts ON ts.demand_id = d.id
    LEFT JOIN users u_sug ON u_sug.id = ts.suggested_editor_id
    WHERE d.deleted_at IS NULL
      AND d.editor_id IS NULL
      AND d.format <> 'Cortes'
      AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
    ORDER BY
      CASE d.priority
        WHEN 'Urgente' THEN 0
        WHEN 'Alta' THEN 1
        WHEN 'Normal' THEN 2
        ELSE 3
      END,
      COALESCE(d.post_date, d.approval_date) ASC NULLS LAST,
      d.created_at ASC
    LIMIT ${LIMITE_LISTA}
  `;
  return linhas.map((linha) => ({
    id: linha.id,
    titulo: linha.title,
    formato: linha.format,
    influencerNome: linha.influencer_nome,
    prioridade: linha.priority,
    atrasada: linha.atrasada,
    prazo: linha.prazo,
    editorSugerido: linha.sugerido,
  }));
}

function indicador(chave: ChaveIndicador, rotulo: string, valor: number): Indicador {
  return { chave, rotulo, valor: Number(valor) };
}

async function carregarAdministrador(usuario: UsuarioSessao): Promise<VisaoAdministrador> {
  const sql = db();
  const atrasada = exprAtrasada(sql);
  const verRelatorios = usuario.permissoes.verRelatorios;
  const abertas = sql`d.deleted_at IS NULL AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')`;
  const [contagem, atrasadas, aprovacoes, alertasPrazo, prioridades, carga] = await Promise.all([
    sql<
      {
        total: number;
        atrasadas: number;
        em_aprovacao: number;
        pendencias: number;
        aguardando_editor: number;
        em_producao: number;
      }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE deleted_at IS NULL)::int AS total,
        COUNT(*) FILTER (WHERE
          deleted_at IS NULL
          AND status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
          AND COALESCE(post_date, approval_date) < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        )::int AS atrasadas,
        COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'Aprovação')::int AS em_aprovacao,
        (SELECT COUNT(*)::int FROM mandatory_schedules WHERE status = 'Pendente') AS pendencias,
        COUNT(*) FILTER (WHERE deleted_at IS NULL AND editor_id IS NULL)::int AS aguardando_editor,
        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND status NOT IN ('Concluída', 'Cancelada', 'Reprovada')
        )::int AS em_producao
      FROM demands
    `,
    listarDemandas(sql, atrasada, LIMITE_AMOSTRA),
    listarDemandas(sql, sql`d.deleted_at IS NULL AND d.status = 'Aprovação'`, LIMITE_AMOSTRA),
    listarAlertas(sql, sql`d.deleted_at IS NULL`),
    listarPrioridades(sql, abertas),
    listarCarga(sql),
  ]);
  const [saude, concluidas14] = await Promise.all([
    verRelatorios ? carregarSaude(sql, carga) : Promise.resolve(null),
    verRelatorios ? listarConcluidas14(sql) : Promise.resolve([]),
  ]);
  const linha = contagem[0];
  return {
    perfil: 'Administrador',
    titulo: 'Visão geral da operação',
    indicadores: [
      indicador('aguardandoEditor', 'Aguardando editor', linha?.aguardando_editor ?? 0),
      indicador('emProducao', 'Em produção', linha?.em_producao ?? 0),
      indicador('atrasadas', 'Atrasadas', linha?.atrasadas ?? 0),
      indicador('aguardandoAprovacao', 'Aguardando aprovação', linha?.em_aprovacao ?? 0),
    ],
    alertasPrazo,
    prioridades,
    contadores: {
      total: Number(linha?.total ?? 0),
      atrasadas: Number(linha?.atrasadas ?? 0),
      emAprovacao: Number(linha?.em_aprovacao ?? 0),
      pendencias: Number(linha?.pendencias ?? 0),
    },
    atrasadas,
    aprovacoes,
    carga,
    saude,
    concluidas14,
  };
}

async function carregarEditor(usuario: UsuarioSessao): Promise<VisaoEditor> {
  const sql = db();
  const escopo = escopoEditor(sql, usuario.id);
  const proprias = sql`d.deleted_at IS NULL AND d.editor_id = ${usuario.id}`;
  const ondePrioridade = usuario.ehAprovadorDelegado
    ? sql`${escopo} AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada')`
    : sql`${proprias} AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')`;
  const [demandas, relogios, entregas, contagem, alertasPrazo, prioridades, fila] = await Promise.all([
    listarDemandas(sql, escopo, LIMITE_LISTA),
    listarRelogiosAbertos(sql, escopo, LIMITE_LISTA),
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
          WHERE ad.approver_id = ${usuario.id}
        )
      ORDER BY e.delivered_at ASC
      LIMIT ${LIMITE_LISTA}
    `,
    sql<{ abertas: number; proximos: number; aprovacao: number; atrasadas: number; ocupadas: number }[]>`
      SELECT
        COUNT(*) FILTER (
          WHERE status NOT IN ('Concluída', 'Cancelada', 'Reprovada')
        )::int AS abertas,
        COUNT(*) FILTER (
          WHERE status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
            AND COALESCE(post_date, approval_date) IS NOT NULL
            AND (COALESCE(post_date, approval_date) - (now() AT TIME ZONE 'America/Sao_Paulo')::date) BETWEEN 0 AND 2
        )::int AS proximos,
        COUNT(*) FILTER (WHERE status = 'Aprovação')::int AS aprovacao,
        COUNT(*) FILTER (
          WHERE status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
            AND COALESCE(post_date, approval_date) < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        )::int AS atrasadas,
        COUNT(*) FILTER (
          WHERE status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
        )::int AS ocupadas
      FROM demands
      WHERE deleted_at IS NULL
        AND editor_id = ${usuario.id}
    `,
    listarAlertas(sql, proprias),
    listarPrioridades(sql, ondePrioridade),
    listarFila(sql),
  ]);
  const linha = contagem[0];
  return {
    perfil: 'Editor',
    titulo: usuario.ehAprovadorDelegado ? 'Sua fila e aprovações autorizadas' : 'Sua fila de edição',
    indicadores: [
      indicador('tarefasAtuais', 'Tarefas atuais', linha?.abertas ?? 0),
      indicador('proximosPrazos', 'Próximos prazos', linha?.proximos ?? 0),
      indicador('aguardandoAprovacao', 'Aguardando aprovação', linha?.aprovacao ?? 0),
      indicador('atrasadas', 'Atrasadas', linha?.atrasadas ?? 0),
    ],
    alertasPrazo,
    prioridades,
    demandas,
    ciclos: relogios.map((ciclo) => ({
      demandaId: ciclo.demandaId,
      titulo: ciclo.titulo,
      decorridoMs: ciclo.baseMs,
      atualizadoEmMs: ciclo.atualizadoEmMs,
      pausado: ciclo.pausado,
    })),
    entregas: entregas.map((entrega) => ({
      id: entrega.id,
      demandaId: entrega.demand_id,
      titulo: entrega.titulo,
      editorNome: entrega.editor_nome,
      versao: entrega.version,
      entregueEm: entrega.delivered_at,
    })),
    fila,
    ocupadas: Number(linha?.ocupadas ?? 0),
  };
}

async function carregarInfluencer(usuarioId: string): Promise<VisaoInfluencer> {
  const sql = db();
  const proprias = sql`d.deleted_at IS NULL AND d.influencer_id = ${usuarioId}`;
  const [demandas, pendencias, agendamentos, contagem, alertasPrazo, prioridades] = await Promise.all([
    listarDemandas(sql, proprias, LIMITE_LISTA),
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
    sql<{ abertas: number; aprovacao: number; concluidas: number; atrasadas: number }[]>`
      SELECT
        COUNT(*) FILTER (
          WHERE status NOT IN ('Concluída', 'Cancelada', 'Reprovada')
        )::int AS abertas,
        COUNT(*) FILTER (WHERE status = 'Aprovação')::int AS aprovacao,
        COUNT(*) FILTER (WHERE status = 'Concluída')::int AS concluidas,
        COUNT(*) FILTER (
          WHERE status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
            AND COALESCE(post_date, approval_date) < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        )::int AS atrasadas
      FROM demands
      WHERE deleted_at IS NULL
        AND influencer_id = ${usuarioId}
    `,
    listarAlertas(sql, proprias),
    listarPrioridades(
      sql,
      sql`${proprias} AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada')`,
    ),
  ]);
  const linha = contagem[0];
  return {
    perfil: 'Influencer',
    titulo: 'Acompanhe seus conteúdos',
    indicadores: [
      indicador('emProducao', 'Em produção', linha?.abertas ?? 0),
      indicador('aguardandoAprovacao', 'Aguardando aprovação', linha?.aprovacao ?? 0),
      indicador('concluidas', 'Concluídas', linha?.concluidas ?? 0),
      indicador('atrasadas', 'Atrasadas', linha?.atrasadas ?? 0),
    ],
    alertasPrazo,
    prioridades,
    demandas,
    pendencias: pendencias.map((pendencia) => ({
      id: pendencia.id,
      demandaId: pendencia.demand_id,
      titulo: pendencia.title,
    })),
    agendamentos: agendamentos.map((agendamento) => ({
      id: agendamento.id,
      titulo: agendamento.title,
      plataforma: agendamento.platform,
      quando: agendamento.scheduled_at,
    })),
  };
}

/** Visão do dashboard conforme o perfil da sessão. */
export async function carregarDashboard(usuario: UsuarioSessao): Promise<VisaoDashboard> {
  if (usuario.perfil === 'Administrador') return carregarAdministrador(usuario);
  if (usuario.perfil === 'Influencer') return carregarInfluencer(usuario.id);
  return carregarEditor(usuario);
}
