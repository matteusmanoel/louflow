import type { PropsSecaoDemanda } from '@/features/demandas/secoes';
import { listarEntregasDemanda } from '@/features/aprovacoes/consultas';

/**
 * Seção reservada do detalhe da Demanda: Entregas e Aprovação da Demanda.
 * Dona: S1-14 (#11569). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function EntregasSecao({ demandaId, usuario }: PropsSecaoDemanda) {
  void usuario;
  const entregas = await listarEntregasDemanda(demandaId);

  if (entregas.length === 0) {
    return (
      <section aria-label="Entregas">
        <p>Nenhuma entrega registrada.</p>
      </section>
    );
  }

  return (
    <section aria-label="Entregas">
      <ul>
        {entregas.map((e) => (
          <li key={e.entregaId}>
            <span>v{e.versao}</span>
            <span>{e.status}</span>
            <a href={e.link} target="_blank" rel="noopener noreferrer">
              Arquivo
            </a>
            {e.nota && <span>{e.nota}</span>}
            {e.motivo && <span>Motivo: {e.motivo}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
