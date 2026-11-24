import 'server-only';
import type { Db } from '@/lib/db';
import {
  calcularRanking,
  type CaptacaoRanking,
  type DemandaRanking,
  type ItemRanking,
  type OpcoesRanking,
} from '@/features/tv/nota';
import { validarPeriodo, type Periodo } from './periodo';

/**
 * Entradas e cálculo da nota do Ranking, uma só fonte para o Painel de TV e para o /ranking.
 * Fórmula e desempates em features/tv/nota.ts (calcularRankingPeriodo_ do legado). O que muda
 * entre as telas é só o período: a TV usa o mês corrente, o /ranking usa o período escolhido.
 * Dia civil em America/Sao_Paulo, extremos incluídos.
 */

export type LinhaDemandaConcluida = {
  editorId: string;
  editor: string;
  profile: string;
  ativo: boolean;
  staff: boolean;
  formato: string;
  prazo: Date | null;
  pausaMs: number | string;
  ultimaEntregaEm: Date | null;
  ajustes: number | string;
  tempoAtivoMs: number | string;
};

export type LinhaCaptacaoConcluida = {
  editorId: string;
  editor: string;
  profile: string;
  ativo: boolean;
  staff: boolean;
};

type Pessoa = { editorId: string; editor: string; profile: string; ativo: boolean; staff: boolean };

function numero(valor: unknown) {
  const n = typeof valor === 'number' ? valor : Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Quem disputa: Editor ativo e fora da designação de staff. Staff aparece, mas não disputa. */
function participa(pessoa: Pessoa): { staff: boolean; disputa: boolean } {
  const staff = Boolean(pessoa.staff);
  return { staff, disputa: !staff && pessoa.profile === 'Editor' && Boolean(pessoa.ativo) };
}

export function demandasConcluidasNoPeriodo(sql: Db, periodo: Periodo): Promise<LinhaDemandaConcluida[]> {
  const { inicio, fim } = validarPeriodo(periodo);
  return sql<LinhaDemandaConcluida[]>`
    SELECT
      ue.id AS "editorId",
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
      AND (d.completed_at AT TIME ZONE 'America/Sao_Paulo')::date
          BETWEEN ${inicio}::date AND ${fim}::date
  `;
}

export function captacoesConcluidasNoPeriodo(sql: Db, periodo: Periodo): Promise<LinhaCaptacaoConcluida[]> {
  const { inicio, fim } = validarPeriodo(periodo);
  return sql<LinhaCaptacaoConcluida[]>`
    SELECT
      u.id AS "editorId",
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
      AND (c.completed_at AT TIME ZONE 'America/Sao_Paulo')::date
          BETWEEN ${inicio}::date AND ${fim}::date
  `;
}

/** Linhas brutas → entradas da fórmula. Único ponto onde "quem disputa" é decidido. */
export function entradasDoRanking(
  demandas: readonly LinhaDemandaConcluida[],
  captacoes: readonly LinhaCaptacaoConcluida[],
): { demandas: DemandaRanking[]; captacoes: CaptacaoRanking[] } {
  return {
    demandas: demandas.map((linha) => ({
      editorId: linha.editorId,
      editor: linha.editor,
      formato: linha.formato,
      ajustes: numero(linha.ajustes),
      tempoAtivoMs: numero(linha.tempoAtivoMs),
      ...participa(linha),
    })),
    captacoes: captacoes.map((linha) => ({
      editorId: linha.editorId,
      editor: linha.editor,
      ...participa(linha),
    })),
  };
}

/** Nota e posição de quem entregou no período, com a mesma fórmula da TV. */
export async function rankingComNota(
  sql: Db,
  periodo: Periodo,
  opcoes: OpcoesRanking = {},
): Promise<ItemRanking[]> {
  const [demandas, captacoes] = await Promise.all([
    demandasConcluidasNoPeriodo(sql, periodo),
    captacoesConcluidasNoPeriodo(sql, periodo),
  ]);
  const entradas = entradasDoRanking(demandas, captacoes);
  return calcularRanking(entradas.demandas, entradas.captacoes, opcoes);
}
