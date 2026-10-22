import 'server-only';
import type { Tx } from '@/lib/db';
import { ErroDominio } from '@/lib/errors';
import { registrarHistorico } from '@/lib/history';
import type { DemandaStatus } from '@/features/demandas/consultas';

export type { DemandaStatus };

// ---------------------------------------------------------------------------
// Máquina de Estado — S1-10
// Única zona que executa UPDATE demands SET status = ...
// ---------------------------------------------------------------------------

/**
 * Transições válidas do estado da Demanda.
 * Única fonte de verdade para a máquina de status.
 */
export const TRANSICOES: Record<DemandaStatus, readonly DemandaStatus[]> = {
  'Não iniciada':      ['Em execução', 'Cancelada'],
  'Em execução':       ['Aprovação', 'Pausada', 'Cancelada'],
  'Pausada':           ['Em execução', 'Cancelada'],
  'Aprovação':         ['Concluída', 'Ajustes solicitados', 'Em execução', 'Cancelada'],
  'Ajustes solicitados': ['Em execução', 'Cancelada'],
  'Concluída':         [],
  'Reprovada':         [],
  'Cancelada':         [],
};

export type EntradaTransicao = {
  demandaId: string;
  novoStatus: DemandaStatus;
  usuarioId: string;
  /** Motivo facultativo, obrigatório em cancelamentos e rejeições. */
  motivo?: string;
};

/**
 * [ZONA PROTEGIDA] Única função que executa UPDATE demands SET status.
 * Abre SELECT FOR UPDATE, valida a transição, persiste e registra no histórico.
 * Deve ser chamada dentro de uma transação aberta pelo chamador.
 */
export async function transicionarStatus(
  tx: Tx,
  entrada: EntradaTransicao,
): Promise<void> {
  const { demandaId, novoStatus, usuarioId, motivo } = entrada;

  // SELECT FOR UPDATE garante serialização de escritas concorrentes na mesma Demanda.
  const [demanda] = await tx<{ status: DemandaStatus }[]>`
    SELECT status FROM demands WHERE id = ${demandaId} FOR UPDATE`;

  if (!demanda) {
    throw new ErroDominio('Demanda não encontrada.');
  }

  const permitidos = TRANSICOES[demanda.status];
  if (!permitidos.includes(novoStatus)) {
    throw new ErroDominio(
      `Transição inválida: ${demanda.status} → ${novoStatus}.`,
    );
  }

  await tx`
    UPDATE demands
       SET status     = ${novoStatus},
           updated_at = now()
           ${novoStatus === 'Concluída' ? tx`, completed_at = now()` : tx``}
     WHERE id = ${demandaId}`;

  await registrarHistorico(tx, {
    demandaId,
    acao: `status:${novoStatus}`,
    usuarioId,
    detalhes: motivo,
  });
}

// Re-export do componente para uso via features/demandas/secoes.ts
export { StatusControle } from './components/StatusControle';
