import type { PropsSecaoDemanda } from '@/features/demandas/secoes';

/**
 * Seção reservada do detalhe da Demanda: Ficha Técnica da Demanda (somente leitura para o Editor).
 * Dona: S1-11 (#11566). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function FichaSecao({ demandaId, usuario }: PropsSecaoDemanda) {
  void demandaId;
  void usuario;
  return null;
}
