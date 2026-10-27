import type { PropsSecaoDemanda } from '@/features/demandas/secoes';
import { carregarDemandaPagina } from '@/features/demandas/consultas';
import { TRANSICOES, type DemandaStatus } from '@/features/status/index';

/**
 * Seção reservada do detalhe da Demanda: Controle de Status, Prioridade, Editor e relógio de tempo ativo.
 * Dona: S1-10 (#11565). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function StatusControle({ demandaId, usuario }: PropsSecaoDemanda) {
  const demanda = await carregarDemandaPagina(demandaId);
  if (!demanda) return null;

  const podeMudarStatus = usuario.permissoes.alterarStatus;
  const proximos: DemandaStatus[] = podeMudarStatus
    ? ([...TRANSICOES[demanda.status]] as DemandaStatus[])
    : [];

  return (
    <section aria-label="Controle de Status">
      <p>
        <strong>Status atual:</strong> {demanda.status}
      </p>
      {proximos.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Transições disponíveis">
          {proximos.map((s) => (
            <span
              key={s}
              data-status={s}
              className="rounded-[var(--raio-pilula)] border border-[var(--borda-app)] px-2.5 py-1 text-xs text-[var(--texto-forte)]"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
