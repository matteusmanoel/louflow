import 'server-only';
import { db, type Db } from '@/lib/db';

export const VALOR_USO_DRONE_REAIS = 250;

export type UsoDrone = {
  id: string;
  used_on: string; // YYYY-MM-DD
  responsible: string;
  served_profile: string;
  reason: string;
  location: string;
  status: 'Ativo' | 'Cancelado';
  updated_at: string; // ISO string — usado como versão para concorrência otimista
  created_at: string;
};

export type ResultadoListarUsosDrone = {
  usos: UsoDrone[];
  totalAtivosReais: number; // count(Ativo) × R$ 250
};

function toIso(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

type LinhaRaw = Omit<UsoDrone, 'updated_at' | 'created_at'> & { updated_at: unknown; created_at: unknown };

function mapearLinha(l: LinhaRaw): UsoDrone {
  return {
    id: l.id,
    used_on: l.used_on,
    responsible: l.responsible,
    served_profile: l.served_profile,
    reason: l.reason,
    location: l.location,
    status: l.status,
    updated_at: toIso(l.updated_at),
    created_at: toIso(l.created_at),
  };
}

/**
 * Lista os usos de drone, opcionalmente filtrados por período (datas no formato YYYY-MM-DD).
 * Retorna também o total em R$ dos registros Ativos no período.
 * Aceita `sql` opcional para injeção nos testes (usa db() por padrão).
 */
export async function listarUsosDrone(
  sqlInjetado?: Db,
  filtro?: { inicio?: string; fim?: string },
): Promise<ResultadoListarUsosDrone> {
  const sql = sqlInjetado ?? db();
  const inicio = filtro?.inicio ?? null;
  const fim = filtro?.fim ?? null;

  const linhas = await sql<LinhaRaw[]>`
    SELECT
      id,
      used_on::text,
      responsible,
      served_profile,
      reason,
      location,
      status,
      updated_at,
      created_at
    FROM drone_usages
    WHERE
      (${inicio}::date IS NULL OR used_on >= ${inicio}::date)
      AND (${fim}::date IS NULL OR used_on <= ${fim}::date)
    ORDER BY used_on DESC, created_at DESC
  `;

  const usos: UsoDrone[] = linhas.map(mapearLinha);
  const totalAtivos = usos.filter((u) => u.status === 'Ativo').length;

  return {
    usos,
    totalAtivosReais: totalAtivos * VALOR_USO_DRONE_REAIS,
  };
}

/** Carrega um único uso de drone pelo id. Retorna null se não encontrado. */
export async function carregarUsoDrone(id: string, sqlInjetado?: Db): Promise<UsoDrone | null> {
  const sql = sqlInjetado ?? db();
  const [linha] = await sql<LinhaRaw[]>`
    SELECT
      id,
      used_on::text,
      responsible,
      served_profile,
      reason,
      location,
      status,
      updated_at,
      created_at
    FROM drone_usages
    WHERE id = ${id}
  `;

  if (!linha) return null;
  return mapearLinha(linha);
}
