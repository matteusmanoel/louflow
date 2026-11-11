import 'server-only';
import type { Sql, Tx } from '@/lib/db';
import { formatarDataHora } from '@/lib/datas';
import type { UsuarioSessao } from '@/lib/session';

export type AvisoPainel = {
  id: number;
  titulo: string;
  editor: string;
  status: string;
  texto: string;
  quando: string;
};

const LIMITE = 20;

/**
 * Últimos registros do histórico visíveis para a sessão.
 * O sino guarda no navegador o que já foi lido; não há tabela de caixa de entrada.
 */
export async function listarAvisosRecentes(sql: Sql | Tx, usuario: UsuarioSessao): Promise<AvisoPainel[]> {
  if (usuario.perfil === 'Premios') return [];

  const linhas = await sql<
    {
      id: string | number;
      title: string;
      editor: string | null;
      status: string;
      action: string;
      created_at: Date;
    }[]
  >`
    SELECT
      h.id,
      d.title,
      u.name AS editor,
      d.status,
      h.action,
      h.created_at
    FROM history h
    JOIN demands d ON d.id = h.demand_id
    LEFT JOIN users u ON u.id = d.editor_id
    WHERE d.deleted_at IS NULL
      AND (
        ${usuario.perfil} = 'Administrador'
        OR (${usuario.perfil} = 'Influencer' AND d.influencer_id = ${usuario.id})
        OR (
          ${usuario.perfil} = 'Editor'
          AND (
            d.editor_id = ${usuario.id}
            OR d.editor_id IN (
              SELECT ad.editor_id
              FROM approval_delegations ad
              WHERE ad.approver_id = ${usuario.id}
            )
          )
        )
      )
    ORDER BY h.id DESC
    LIMIT ${LIMITE}
  `;

  return linhas.map((linha) => ({
    id: Number(linha.id),
    titulo: linha.title,
    editor: linha.editor ?? 'A definir',
    status: linha.status,
    texto: linha.action.startsWith('status:')
      ? 'O andamento da demanda foi atualizado'
      : linha.action,
    quando: formatarDataHora(linha.created_at),
  }));
}
