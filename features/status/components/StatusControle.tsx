import { Badge } from '@/components/ui/badge';
import type { PropsSecaoDemanda } from '@/features/demandas/secoes';
import { carregarDemandaPagina } from '@/features/demandas/consultas';
import { lerRelogioDemanda } from '@/features/status/consultas';
import { RelogioEdicao } from '@/features/status/components/RelogioEdicao';
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
  const relogio = await lerRelogioDemanda(demandaId);

  return (
    <section aria-label="Controle de Status" className="grid gap-2">
      <p>
        <strong>Status atual:</strong> {demanda.status}
      </p>
      {relogio && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-[var(--texto-suave)]">
          <span>Tempo ativo</span>
          <RelogioEdicao
            baseMs={relogio.baseMs}
            atualizadoEmMs={relogio.atualizadoEmMs}
            pausado={relogio.pausado}
          />
          {relogio.pausado && <Badge variant="warning">Pausado</Badge>}
          <span>V{relogio.versao}</span>
        </p>
      )}
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
