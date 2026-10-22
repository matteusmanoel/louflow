import 'server-only';
import { db } from '@/lib/db';

export type RegistroAuditoria = {
  id: string;
  action: string;
  user_id: string | null;
  usuario_nome: string | null;
  target: string | null;
  details: string | null;
  created_at: Date;
};

export type FiltrosAuditoria = {
  acao?: string;
  usuarioId?: string;
};

export type PaginaAuditoria = {
  registros: RegistroAuditoria[];
  total: number;
  pagina: number;
  totalPaginas: number;
};

/** Lista registros de auditoria paginados. Requer gerenciarUsuarios. */
export async function listarAuditoria(
  pagina = 1,
  filtros?: FiltrosAuditoria,
): Promise<PaginaAuditoria> {
  const porPagina = 50;
  const offset = (pagina - 1) * porPagina;

  const acaoFiltro = filtros?.acao ? `%${filtros.acao}%` : null;
  const usuarioFiltro = filtros?.usuarioId ?? null;

  const totalRows = await db()<{ total: string }[]>`
    SELECT count(*)::text AS total
    FROM audit_log al
    WHERE (${acaoFiltro}::text IS NULL OR al.action ILIKE ${acaoFiltro}::text)
      AND (${usuarioFiltro}::uuid IS NULL OR al.user_id = ${usuarioFiltro}::uuid)
  `;
  const total = totalRows[0]?.total ?? '0';

  const registros = await db()<RegistroAuditoria[]>`
    SELECT
      al.id::text,
      al.action,
      al.user_id::text,
      u.name AS usuario_nome,
      al.target,
      al.details,
      al.created_at
    FROM audit_log al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE (${acaoFiltro}::text IS NULL OR al.action ILIKE ${acaoFiltro}::text)
      AND (${usuarioFiltro}::uuid IS NULL OR al.user_id = ${usuarioFiltro}::uuid)
    ORDER BY al.created_at DESC
    LIMIT ${porPagina} OFFSET ${offset}
  `;

  const totalNum = Number(total ?? '0');
  return {
    registros,
    total: totalNum,
    pagina,
    totalPaginas: Math.max(1, Math.ceil(totalNum / porPagina)),
  };
}
