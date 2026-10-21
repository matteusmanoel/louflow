import 'server-only';
import type { Db } from './db';

/**
 * Histórico da Demanda. Toda mutação de Demanda chama esta função na mesma transação:
 * max(history.id) é a revisão lida por /api/sync.
 */
export async function registrarHistorico(
  tx: Db,
  entrada: { demandaId: string | null; acao: string; usuarioId: string | null; detalhes?: string },
): Promise<number> {
  const [linha] = await tx<{ id: string }[]>`
    INSERT INTO history (demand_id, action, user_id, details)
    VALUES (${entrada.demandaId}, ${entrada.acao}, ${entrada.usuarioId}, ${entrada.detalhes ?? null})
    RETURNING id`;
  return Number(linha!.id);
}

export async function revisaoAtual(sql: Db): Promise<number> {
  const [linha] = await sql<{ revisao: string | null }[]>`SELECT max(id) AS revisao FROM history`;
  return Number(linha?.revisao ?? 0);
}
