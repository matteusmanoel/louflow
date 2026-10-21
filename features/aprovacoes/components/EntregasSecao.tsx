import type { PropsSecaoDemanda } from '@/features/demandas/secoes';

/**
 * Seção reservada do detalhe da Demanda: Entregas e Aprovação da Demanda.
 * Dona: S1-14 (#11569). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function EntregasSecao({ demandaId, usuario }: PropsSecaoDemanda) {
  void demandaId;
  void usuario;
  return null;
}
