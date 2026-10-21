import type { PropsSecaoDemanda } from '@/features/demandas/secoes';

/**
 * Seção reservada do detalhe da Demanda: Comentários da Demanda.
 * Dona: S1-12 (#11567). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function ComentariosSecao({ demandaId, usuario }: PropsSecaoDemanda) {
  void demandaId;
  void usuario;
  return null;
}
