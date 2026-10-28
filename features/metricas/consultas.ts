import 'server-only';
import { db, type Db } from '@/lib/db';
import { hojeSaoPaulo, validarDia, validarPeriodo, type Periodo } from './periodo';

export type { Periodo };

/**
 * Consultas de produção compartilhadas pelo Ranking e pelo Analista.
 * Atrasada é o mesmo predicado do quadro: fora da Lixeira, status ainda aberto
 * (não Concluída, Cancelada, Reprovada nem Aprovação) e prazo anterior ao dia
 * civil em America/Sao_Paulo.
 */

export type ProdutividadeEditor = {
  editorId: string;
  nome: string;
  concluidas: number;
  emAndamento: number;
  atrasadas: number;
  /** Média de active_ms dos ciclos Concluídos encerrados no período. */
  tempoMedioMs: number | null;
};

export type DemandaAtrasada = {
  id: string;
  titulo: string;
  editorId: string | null;
  editorNome: string | null;
  prazo: string;
};

export type ResumoDia = {
  dia: string;
  entraram: number;
  mudaramStatus: number;
  concluidas: number;
  atrasadas: number;
};

function numero(valor: unknown): number {
  return Number(valor ?? 0);
}

function media(valor: unknown): number | null {
  if (valor == null) return null;
  return Number(valor);
}

/**
 * Por editor no período (dias civis inclusivos em America/Sao_Paulo):
 * concluídas pelo completed_at, em andamento se o status atual é Em execução
 * ou Pausada e algum ciclo cobre o período, atrasadas com prazo dentro do
 * período, tempo médio só de ciclos Concluído encerrados no período.
 */
export async function produtividadePorEditor(periodo: Periodo, sql: Db = db()): Promise<ProdutividadeEditor[]> {
  const { inicio, fim } = validarPeriodo(periodo);
  const linhas = await sql<{
    editor_id: string;
    nome: string;
    concluidas: number;
    em_andamento: number;
    atrasadas: number;
    tempo_medio_ms: string | number | null;
  }[]>`
    WITH contagens AS (
      SELECT d.editor_id,
             COUNT(*) FILTER (
               WHERE d.status = 'Concluída'
                 AND (d.completed_at AT TIME ZONE 'America/Sao_Paulo')::date
                     BETWEEN ${inicio}::date AND ${fim}::date
             )::int AS concluidas,
             COUNT(*) FILTER (
               WHERE d.status IN ('Em execução', 'Pausada')
                 AND EXISTS (
                   SELECT 1
                     FROM editing_cycles c
                    WHERE c.demand_id = d.id
                      AND (c.started_at AT TIME ZONE 'America/Sao_Paulo')::date <= ${fim}::date
                      AND (
                        c.ended_at IS NULL
                        OR (c.ended_at AT TIME ZONE 'America/Sao_Paulo')::date >= ${inicio}::date
                      )
                 )
             )::int AS em_andamento,
             COUNT(*) FILTER (
               WHERE d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
                 AND COALESCE(d.post_date, d.approval_date) < (now() AT TIME ZONE 'America/Sao_Paulo')::date
                 AND COALESCE(d.post_date, d.approval_date) BETWEEN ${inicio}::date AND ${fim}::date
             )::int AS atrasadas
        FROM demands d
       WHERE d.deleted_at IS NULL
         AND d.editor_id IS NOT NULL
       GROUP BY d.editor_id
    ),
    tempos AS (
      SELECT c.editor_id,
             ROUND(AVG(c.active_ms))::bigint AS tempo_medio_ms
        FROM editing_cycles c
       WHERE c.status = 'Concluído'
         AND c.active_ms IS NOT NULL
         AND c.ended_at IS NOT NULL
         AND (c.ended_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN ${inicio}::date AND ${fim}::date
       GROUP BY c.editor_id
    ),
    ids AS (
      SELECT editor_id FROM contagens
      UNION
      SELECT editor_id FROM tempos
    )
    SELECT u.id AS editor_id,
           u.name AS nome,
           COALESCE(contagens.concluidas, 0)::int AS concluidas,
           COALESCE(contagens.em_andamento, 0)::int AS em_andamento,
           COALESCE(contagens.atrasadas, 0)::int AS atrasadas,
           tempos.tempo_medio_ms
      FROM ids
      JOIN users u ON u.id = ids.editor_id
      LEFT JOIN contagens ON contagens.editor_id = ids.editor_id
      LEFT JOIN tempos ON tempos.editor_id = ids.editor_id
     WHERE COALESCE(contagens.concluidas, 0)
         + COALESCE(contagens.em_andamento, 0)
         + COALESCE(contagens.atrasadas, 0) > 0
        OR tempos.tempo_medio_ms IS NOT NULL
     ORDER BY concluidas DESC, u.name
  `;

  return linhas.map((linha) => ({
    editorId: linha.editor_id,
    nome: linha.nome,
    concluidas: numero(linha.concluidas),
    emAndamento: numero(linha.em_andamento),
    atrasadas: numero(linha.atrasadas),
    tempoMedioMs: media(linha.tempo_medio_ms),
  }));
}

/** Média de active_ms dos ciclos Concluído do editor (ou de todos) no período. */
export async function tempoMedioEdicao(
  periodo: Periodo,
  editorId?: string,
  sql: Db = db(),
): Promise<number | null> {
  const { inicio, fim } = validarPeriodo(periodo);
  const [linha] = await sql<{ media: string | number | null }[]>`
    SELECT ROUND(AVG(c.active_ms))::bigint AS media
      FROM editing_cycles c
     WHERE c.status = 'Concluído'
       AND c.active_ms IS NOT NULL
       AND c.ended_at IS NOT NULL
       AND (c.ended_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN ${inicio}::date AND ${fim}::date
       AND (${editorId ?? null}::uuid IS NULL OR c.editor_id = ${editorId ?? null}::uuid)
  `;
  return media(linha?.media);
}

/** Demandas atrasadas agora, o mesmo predicado do quadro. */
export async function listarDemandasAtrasadas(editorId?: string, sql: Db = db()): Promise<DemandaAtrasada[]> {
  const linhas = await sql<{
    id: string;
    titulo: string;
    editor_id: string | null;
    editor_nome: string | null;
    prazo: string;
  }[]>`
    SELECT d.id,
           d.title AS titulo,
           d.editor_id,
           u.name AS editor_nome,
           COALESCE(d.post_date, d.approval_date)::text AS prazo
      FROM demands d
      LEFT JOIN users u ON u.id = d.editor_id
     WHERE d.deleted_at IS NULL
       AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
       AND COALESCE(d.post_date, d.approval_date) < (now() AT TIME ZONE 'America/Sao_Paulo')::date
       AND (${editorId ?? null}::uuid IS NULL OR d.editor_id = ${editorId ?? null}::uuid)
     ORDER BY prazo, d.title
  `;
  return linhas.map((linha) => ({
    id: linha.id,
    titulo: linha.titulo,
    editorId: linha.editor_id,
    editorNome: linha.editor_nome,
    prazo: linha.prazo,
  }));
}

/**
 * Movimento de um dia civil. Atrasadas usam o dia do relatório como limite,
 * para o número não depender do relógio de quando a pergunta é feita.
 */
export async function resumoDoDia(dia: string, sql: Db = db()): Promise<ResumoDia> {
  const data = validarDia(dia);
  const [linha] = await sql<{
    entraram: number;
    mudaram: number;
    concluidas: number;
    atrasadas: number;
  }[]>`
    SELECT
      (SELECT COUNT(*)::int FROM demands
        WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date = ${data}::date) AS entraram,
      (SELECT COUNT(*)::int FROM history
        WHERE action LIKE 'status:%'
          AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = ${data}::date) AS mudaram,
      (SELECT COUNT(*)::int FROM demands
        WHERE (completed_at AT TIME ZONE 'America/Sao_Paulo')::date = ${data}::date) AS concluidas,
      (SELECT COUNT(*)::int FROM demands
        WHERE deleted_at IS NULL
          AND status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
          AND COALESCE(post_date, approval_date) < ${data}::date) AS atrasadas
  `;
  return {
    dia: data,
    entraram: numero(linha?.entraram),
    mudaramStatus: numero(linha?.mudaram),
    concluidas: numero(linha?.concluidas),
    atrasadas: numero(linha?.atrasadas),
  };
}

export { hojeSaoPaulo };
