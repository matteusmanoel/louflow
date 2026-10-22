import 'server-only';
import { db } from '@/lib/db';
import type { UsuarioSessao } from '@/lib/session';

export type EntregaListada = {
  entregaId: string;
  demandaId: string;
  demandaTitulo: string;
  versao: number;
  link: string;
  nota: string | null;
  editorNome: string | null;
  entregueEm: Date;
  status: string;
  motivo: string | null;
  avaliadoEm: Date | null;
  avaliadorNome: string | null;
};

/**
 * Lista Demandas aguardando aprovação (status = 'Aprovação').
 * Administrador vê todas; Influencer vê somente as suas; aprovadores delegados veem as atribuídas.
 */
export async function listarAprovacoes(usuario: UsuarioSessao): Promise<EntregaListada[]> {
  const sql = db();

  const linhas = await sql<
    {
      id: string;
      demand_id: string;
      demand_title: string;
      version: number;
      link: string;
      note: string | null;
      editor_nome: string | null;
      delivered_at: Date;
      status: string;
      reason: string | null;
      evaluated_at: Date | null;
      avaliador_nome: string | null;
    }[]
  >`
    SELECT
      d.id,
      d.demand_id,
      dem.title AS demand_title,
      d.version,
      d.link,
      d.note,
      e.name  AS editor_nome,
      d.delivered_at,
      d.status,
      d.reason,
      d.evaluated_at,
      av.name AS avaliador_nome
    FROM deliveries d
    JOIN demands dem ON dem.id = d.demand_id
    LEFT JOIN users  e  ON e.id  = d.editor_id
    LEFT JOIN users  av ON av.id = d.evaluated_by
    WHERE d.status = 'Aguardando aprovação'
      AND dem.deleted_at IS NULL
      ${
        usuario.perfil === 'Administrador' || usuario.permissoes.verTodasDemandas
          ? sql``
          : usuario.ehAprovadorDelegado
          ? sql`AND EXISTS (
                  SELECT 1 FROM approval_delegations ad
                   WHERE ad.approver_id = ${usuario.id}
                     AND ad.editor_id   = dem.editor_id
                )`
          : sql`AND dem.influencer_id = ${usuario.id}`
      }
    ORDER BY d.delivered_at ASC`;

  return linhas.map((r) => ({
    entregaId: r.id,
    demandaId: r.demand_id,
    demandaTitulo: r.demand_title,
    versao: r.version,
    link: r.link,
    nota: r.note,
    editorNome: r.editor_nome,
    entregueEm: r.delivered_at,
    status: r.status,
    motivo: r.reason,
    avaliadoEm: r.evaluated_at,
    avaliadorNome: r.avaliador_nome,
  }));
}

/** Lista histórico de entregas de uma Demanda específica. */
export async function listarEntregasDemanda(demandaId: string): Promise<EntregaListada[]> {
  const sql = db();

  const linhas = await sql<
    {
      id: string;
      demand_id: string;
      demand_title: string;
      version: number;
      link: string;
      note: string | null;
      editor_nome: string | null;
      delivered_at: Date;
      status: string;
      reason: string | null;
      evaluated_at: Date | null;
      avaliador_nome: string | null;
    }[]
  >`
    SELECT
      d.id,
      d.demand_id,
      dem.title  AS demand_title,
      d.version,
      d.link,
      d.note,
      e.name     AS editor_nome,
      d.delivered_at,
      d.status,
      d.reason,
      d.evaluated_at,
      av.name    AS avaliador_nome
    FROM deliveries d
    JOIN demands dem ON dem.id = d.demand_id
    LEFT JOIN users e  ON e.id  = d.editor_id
    LEFT JOIN users av ON av.id = d.evaluated_by
    WHERE d.demand_id = ${demandaId}
    ORDER BY d.version ASC`;

  return linhas.map((r) => ({
    entregaId: r.id,
    demandaId: r.demand_id,
    demandaTitulo: r.demand_title,
    versao: r.version,
    link: r.link,
    nota: r.note,
    editorNome: r.editor_nome,
    entregueEm: r.delivered_at,
    status: r.status,
    motivo: r.reason,
    avaliadoEm: r.evaluated_at,
    avaliadorNome: r.avaliador_nome,
  }));
}
