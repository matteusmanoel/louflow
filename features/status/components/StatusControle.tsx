import type { PropsSecaoDemanda } from '@/features/demandas/secoes';

/**
 * Seção reservada do detalhe da Demanda: Controle de Status, Prioridade, Editor e relógio de tempo ativo.
 * Dona: S1-10 (#11565). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function StatusControle({ demandaId, usuario }: PropsSecaoDemanda) {
  void demandaId;
  void usuario;
  return null;
}
