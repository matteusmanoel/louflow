import 'server-only';

import { db, type Db } from '@/lib/db';
import type { paraDtoTv } from '@/lib/tv';
import {
  ALERTA_PRAZO_DIAS,
  ENTREGAS_DIAS,
  LINHAS_POR_SLIDE,
  calcularProdutividade,
  calcularRanking,
  selecionarCarga,
  type CaptacaoRanking,
  type DemandaProdutividade,
  type DemandaRanking,
} from './nota';

export type DadosBrutosTv = Parameters<typeof paraDtoTv>[0];

type EditorFlags = { editor: string; profile: string; ativo: boolean; staff: boolean };

function participa(linha: EditorFlags): { staff: boolean; disputa: boolean } {
  const staff = Boolean(linha.staff);
  return { staff, disputa: !staff && linha.profile === 'Editor' && Boolean(linha.ativo) };
}

function numero(valor: unknown) {
  const n = typeof valor === 'number' ? valor : Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** S1-09 (#11564): consultas do Painel de TV. Só as colunas que o DTO copia. */
export async function carregarDadosTv(sql: Db): Promise<DadosBrutosTv> {
  const [
    resumoRows,
    demandasPendentes,
    atrasadas,
    proximas,
    aprovacoes,
    aprovarRows,
    agendarRows,
    entregas,
    agenda,
    captacoes,
    cortes,
    demandasMes,
    captacoesMes,
    cargaRows,
  ] = await Promise.all([
    sql<{
      criadas: number; concluidas: number; emAndamento: number; atrasadas: number;
      aguardandoAprovacao: number; semEditor: number; totalProximas: number;
    }[]>`
      SELECT
        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')
              = to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM')
        )::int AS criadas,
        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND status = 'Concluída'
            AND to_char(completed_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')
              = to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM')
        )::int AS concluidas,
        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND status NOT IN ('Concluída', 'Cancelada', 'Reprovada')
        )::int AS "emAndamento",
        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
            AND COALESCE(post_date, approval_date) < (timezone('America/Sao_Paulo', now()))::date
        )::int AS atrasadas,
        COUNT(*) FILTER (
          WHERE deleted_at IS NULL AND status = 'Aprovação'
        )::int AS "aguardandoAprovacao",
        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND editor_id IS NULL
            AND status NOT IN ('Concluída', 'Cancelada', 'Reprovada')
        )::int AS "semEditor",
        COUNT(*) FILTER (
          WHERE deleted_at IS NULL
            AND status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
            AND (COALESCE(post_date, approval_date) - (timezone('America/Sao_Paulo', now()))::date)
              BETWEEN 0 AND ${ALERTA_PRAZO_DIAS}
        )::int AS "totalProximas"
      FROM demands
    `,

    sql<{
      id: string; titulo: string; formato: string;
      editor: string | null; influencer: string | null;
      status: string; prioridade: string; prazo: Date | null; diasParaPrazo: number | null;
    }[]>`
      SELECT
        d.id,
        d.title AS titulo,
        d.format AS formato,
        COALESCE(NULLIF(ue.editor_label, ''), ue.name) AS editor,
        ui.name AS influencer,
        d.status,
        d.priority AS prioridade,
        COALESCE(d.post_date, d.approval_date) AS prazo,
        CASE
          WHEN COALESCE(d.post_date, d.approval_date) IS NULL THEN NULL
          ELSE (COALESCE(d.post_date, d.approval_date) - (timezone('America/Sao_Paulo', now()))::date)::int
        END AS "diasParaPrazo"
      FROM demands d
      LEFT JOIN users ue ON ue.id = d.editor_id
      LEFT JOIN users ui ON ui.id = d.influencer_id
      WHERE d.deleted_at IS NULL
        AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada')
      ORDER BY
        CASE d.priority
          WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Normal' THEN 3 ELSE 4
        END,
        COALESCE(d.post_date, d.approval_date) ASC NULLS LAST
      LIMIT ${LINHAS_POR_SLIDE}
    `,

    sql<{
      titulo: string; editor: string | null; influencer: string | null;
      prazo: Date | null; diasParaPrazo: number;
    }[]>`
      SELECT
        d.title AS titulo,
        COALESCE(NULLIF(ue.editor_label, ''), ue.name) AS editor,
        ui.name AS influencer,
        COALESCE(d.post_date, d.approval_date) AS prazo,
        (COALESCE(d.post_date, d.approval_date) - (timezone('America/Sao_Paulo', now()))::date)::int AS "diasParaPrazo"
      FROM demands d
      LEFT JOIN users ue ON ue.id = d.editor_id
      LEFT JOIN users ui ON ui.id = d.influencer_id
      WHERE d.deleted_at IS NULL
        AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
        AND COALESCE(d.post_date, d.approval_date) < (timezone('America/Sao_Paulo', now()))::date
      ORDER BY "diasParaPrazo" ASC
      LIMIT ${LINHAS_POR_SLIDE}
    `,

    sql<{
      titulo: string; editor: string | null; influencer: string | null;
      prazo: Date | null; diasParaPrazo: number;
    }[]>`
      SELECT
        d.title AS titulo,
        COALESCE(NULLIF(ue.editor_label, ''), ue.name) AS editor,
        ui.name AS influencer,
        COALESCE(d.post_date, d.approval_date) AS prazo,
        (COALESCE(d.post_date, d.approval_date) - (timezone('America/Sao_Paulo', now()))::date)::int AS "diasParaPrazo"
      FROM demands d
      LEFT JOIN users ue ON ue.id = d.editor_id
      LEFT JOIN users ui ON ui.id = d.influencer_id
      WHERE d.deleted_at IS NULL
        AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
        AND (COALESCE(d.post_date, d.approval_date) - (timezone('America/Sao_Paulo', now()))::date)
          BETWEEN 0 AND ${ALERTA_PRAZO_DIAS}
      ORDER BY "diasParaPrazo" ASC
      LIMIT ${LINHAS_POR_SLIDE}
    `,

    sql<{
      demandaId: string; titulo: string; editor: string | null; influencer: string | null;
      versao: number; desde: Date; horasEspera: number;
    }[]>`
      SELECT
        "demandaId", titulo, editor, influencer, versao, desde, "horasEspera"
      FROM (
        SELECT DISTINCT ON (del.demand_id)
          del.demand_id AS "demandaId",
          d.title AS titulo,
          COALESCE(NULLIF(ue.editor_label, ''), ue.name) AS editor,
          ui.name AS influencer,
          del.version AS versao,
          del.delivered_at AS desde,
          GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - del.delivered_at)) / 3600))::int AS "horasEspera"
        FROM deliveries del
        JOIN demands d ON d.id = del.demand_id
        LEFT JOIN users ue ON ue.id = del.editor_id
        LEFT JOIN users ui ON ui.id = d.influencer_id
        WHERE del.status = 'Aguardando aprovação'
          AND d.deleted_at IS NULL
          AND d.status = 'Aprovação'
        ORDER BY del.demand_id, del.version DESC, del.delivered_at DESC
      ) ultimas
      ORDER BY "horasEspera" DESC, desde ASC
      LIMIT ${LINHAS_POR_SLIDE}
    `,

    sql<{ id: string; nome: string; aprovar: number }[]>`
      SELECT ui.id, ui.name AS nome, COUNT(*)::int AS aprovar
      FROM demands d
      JOIN users ui ON ui.id = d.influencer_id
      WHERE d.deleted_at IS NULL AND d.status = 'Aprovação'
      GROUP BY ui.id, ui.name
    `,

    sql<{ id: string; nome: string; agendar: number }[]>`
      SELECT ui.id, ui.name AS nome, COUNT(*)::int AS agendar
      FROM mandatory_schedules ms
      JOIN users ui ON ui.id = ms.influencer_id
      WHERE ms.status = 'Pendente'
      GROUP BY ui.id, ui.name
    `,

    sql<{
      titulo: string; editor: string | null; influencer: string | null;
      versao: number; situacao: string; data: Date;
    }[]>`
      SELECT
        d.title AS titulo,
        COALESCE(NULLIF(ue.editor_label, ''), ue.name) AS editor,
        ui.name AS influencer,
        del.version AS versao,
        CASE
          WHEN del.status = 'Aguardando aprovação' AND d.status <> 'Aprovação'
            THEN CASE
              WHEN d.status = 'Concluída' THEN 'Concluída administrativamente'
              ELSE d.status::text
            END
          ELSE del.status
        END AS situacao,
        del.delivered_at AS data
      FROM deliveries del
      JOIN demands d ON d.id = del.demand_id
      LEFT JOIN users ue ON ue.id = del.editor_id
      LEFT JOIN users ui ON ui.id = d.influencer_id
      WHERE d.deleted_at IS NULL
        AND del.delivered_at >= now() - make_interval(days => ${ENTREGAS_DIAS})
      ORDER BY del.delivered_at DESC
      LIMIT ${LINHAS_POR_SLIDE}
    `,

    sql<{
      titulo: string; marca: string; plataforma: string; quando: Date; situacao: string;
      influencer: string | null; avulso: boolean; tipoConteudo: string | null;
    }[]>`
      SELECT
        ps.title AS titulo,
        ps.brand AS marca,
        ps.platform AS plataforma,
        ps.scheduled_at AS quando,
        ps.status AS situacao,
        ui.name AS influencer,
        (ps.demand_id IS NULL) AS avulso,
        ps.content_type AS "tipoConteudo"
      FROM post_schedules ps
      LEFT JOIN users ui ON ui.id = ps.influencer_id
      WHERE ps.status = 'Agendada'
        AND ps.scheduled_at >= (timezone('America/Sao_Paulo', now()))::date AT TIME ZONE 'America/Sao_Paulo'
      ORDER BY ps.scheduled_at ASC
      LIMIT ${LINHAS_POR_SLIDE}
    `,

    sql<{
      inicio: Date; fim: Date; videomaker: string;
      cliente: string | null; assunto: string | null; local: string | null;
      influencer: string | null;
    }[]>`
      SELECT
        c.starts_at AS inicio,
        c.ends_at AS fim,
        COALESCE(NULLIF(uv.editor_label, ''), uv.name) AS videomaker,
        c.client AS cliente,
        c.subject AS assunto,
        c.location AS local,
        ui.name AS influencer
      FROM captures c
      JOIN users uv ON uv.id = c.videomaker_id
      LEFT JOIN users ui ON ui.id = c.influencer_id
      WHERE c.status = 'Agendada'
        AND c.starts_at >= (timezone('America/Sao_Paulo', now()))::date AT TIME ZONE 'America/Sao_Paulo'
      ORDER BY c.starts_at ASC
      LIMIT ${LINHAS_POR_SLIDE}
    `,

    sql<{
      titulo: string; linhaEditorial: string; programa: string;
      dataPostagem: Date | null; situacao: string;
    }[]>`
      SELECT
        title AS titulo,
        editorial_line AS "linhaEditorial",
        source_program AS programa,
        post_date AS "dataPostagem",
        status AS situacao
      FROM clips
      WHERE status = 'Em andamento'
      ORDER BY post_date ASC
      LIMIT ${LINHAS_POR_SLIDE}
    `,

    sql<{
      editor: string; profile: string; ativo: boolean; staff: boolean;
      formato: string; prazo: Date | null; pausaMs: number | string;
      ultimaEntregaEm: Date | null; ajustes: number | string; tempoAtivoMs: number | string;
    }[]>`
      SELECT
        COALESCE(NULLIF(ue.editor_label, ''), ue.name) AS editor,
        ue.profile,
        ue.is_active AS ativo,
        EXISTS (
          SELECT 1 FROM user_permissions up
          WHERE up.user_id = ue.id
            AND up.permission_key = 'notaInformativaRanking'
            AND up.granted
        ) AS staff,
        d.format AS formato,
        COALESCE(d.post_date, d.approval_date) AS prazo,
        COALESCE((
          SELECT SUM(EXTRACT(EPOCH FROM (p.resumed_at - p.paused_at)) * 1000)
          FROM demand_pauses p
          WHERE p.demand_id = d.id AND p.resumed_at IS NOT NULL
        ), 0) AS "pausaMs",
        (
          SELECT MAX(del.delivered_at) FROM deliveries del WHERE del.demand_id = d.id
        ) AS "ultimaEntregaEm",
        (
          SELECT COUNT(*) FROM deliveries del
          WHERE del.demand_id = d.id AND del.status = 'Ajustes solicitados'
        ) AS ajustes,
        COALESCE((
          SELECT SUM(c.active_ms) FROM editing_cycles c
          WHERE c.demand_id = d.id AND c.status = 'Concluído' AND c.active_ms IS NOT NULL
        ), 0) AS "tempoAtivoMs"
      FROM demands d
      JOIN users ue ON ue.id = d.editor_id
      WHERE d.deleted_at IS NULL
        AND d.status = 'Concluída'
        AND to_char(d.completed_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')
          = to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM')
    `,

    sql<{ editor: string; profile: string; ativo: boolean; staff: boolean }[]>`
      SELECT
        COALESCE(NULLIF(u.editor_label, ''), u.name) AS editor,
        u.profile,
        u.is_active AS ativo,
        EXISTS (
          SELECT 1 FROM user_permissions up
          WHERE up.user_id = u.id
            AND up.permission_key = 'notaInformativaRanking'
            AND up.granted
        ) AS staff
      FROM captures c
      JOIN users u ON u.id = c.videomaker_id
      WHERE c.status = 'Concluída'
        AND c.completed_at IS NOT NULL
        AND to_char(c.completed_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM')
          = to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM')
    `,

    sql<{ editor: string; abertas: number; atrasadas: number; cortesEmAndamento: number }[]>`
      SELECT
        COALESCE(NULLIF(u.editor_label, ''), u.name) AS editor,
        COUNT(d.id) FILTER (
          WHERE d.deleted_at IS NULL
            AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada')
        )::int AS abertas,
        COUNT(d.id) FILTER (
          WHERE d.deleted_at IS NULL
            AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
            AND COALESCE(d.post_date, d.approval_date) < (timezone('America/Sao_Paulo', now()))::date
        )::int AS atrasadas,
        COUNT(d.id) FILTER (
          WHERE d.deleted_at IS NULL
            AND d.status = 'Em execução'
            AND lower(d.format) = 'cortes'
        )::int AS "cortesEmAndamento"
      FROM users u
      LEFT JOIN demands d ON d.editor_id = u.id
      WHERE u.profile = 'Editor'
        AND u.is_active
        AND NOT EXISTS (
          SELECT 1 FROM user_permissions up
          WHERE up.user_id = u.id
            AND up.permission_key = 'notaInformativaRanking'
            AND up.granted
        )
      GROUP BY u.id, editor
    `,
  ]);

  const resumo = resumoRows[0] ?? {
    criadas: 0, concluidas: 0, emAndamento: 0, atrasadas: 0,
    aguardandoAprovacao: 0, semEditor: 0, totalProximas: 0,
  };

  const porId = new Map<string, { nome: string; aprovar: number; agendar: number }>();
  for (const linha of aprovarRows) {
    porId.set(linha.id, { nome: linha.nome, aprovar: linha.aprovar, agendar: 0 });
  }
  for (const linha of agendarRows) {
    const atual = porId.get(linha.id);
    if (atual) atual.agendar = linha.agendar;
    else porId.set(linha.id, { nome: linha.nome, aprovar: 0, agendar: linha.agendar });
  }
  const influencers = [...porId.values()]
    .filter((item) => item.aprovar || item.agendar)
    .sort((a, b) => (b.aprovar + b.agendar) - (a.aprovar + a.agendar) || a.nome.localeCompare(b.nome, 'pt-BR'));

  const demandasRanking: DemandaRanking[] = [];
  const demandasProdutividade: DemandaProdutividade[] = [];
  for (const linha of demandasMes) {
    const flags = participa(linha);
    demandasRanking.push({
      editor: linha.editor,
      formato: linha.formato,
      ajustes: numero(linha.ajustes),
      tempoAtivoMs: numero(linha.tempoAtivoMs),
      ...flags,
    });
    demandasProdutividade.push({
      formato: linha.formato,
      prazo: linha.prazo,
      pausaMs: numero(linha.pausaMs),
      ultimaEntregaEm: linha.ultimaEntregaEm,
      tempoAtivoMs: numero(linha.tempoAtivoMs),
    });
  }

  const captacoesRanking: CaptacaoRanking[] = captacoesMes.map((linha) => ({
    editor: linha.editor,
    ...participa(linha),
  }));

  return {
    resumoMes: {
      criadas: resumo.criadas,
      concluidas: resumo.concluidas,
      emAndamento: resumo.emAndamento,
      atrasadas: resumo.atrasadas,
      aguardandoAprovacao: resumo.aguardandoAprovacao,
      semEditor: resumo.semEditor,
    },
    demandasPendentes,
    alertas: {
      totalAtrasadas: resumo.atrasadas,
      totalProximas: resumo.totalProximas,
      itens: [
        ...atrasadas.map((item) => ({ ...item, atrasada: true })),
        ...proximas.map((item) => ({ ...item, atrasada: false })),
      ].slice(0, LINHAS_POR_SLIDE),
    },
    aprovacoes,
    influencers,
    entregas,
    agenda,
    captacoes,
    cortes,
    ranking: calcularRanking(demandasRanking, captacoesRanking),
    produtividade: calcularProdutividade(demandasProdutividade, captacoesMes.length),
    cargaEditores: selecionarCarga(cargaRows),
  };
}

export async function obterDadosPainelTv() {
  return carregarDadosTv(db());
}
