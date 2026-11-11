'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { assumirFicha } from '@/features/demandas/actions';
import { BadgePrioridade } from '@/features/demandas/components/BadgePrioridade';
import type { ItemFila } from '@/features/dashboard/consultas';
import { formatarData } from '@/lib/datas';
import { mostrarFeedback } from '@/lib/toast';

export function FilaCompartilhada({
  itens,
  ocupadas,
  podeAssumir,
}: {
  itens: ItemFila[];
  ocupadas: number;
  podeAssumir: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  function assumir(demandaId: string) {
    iniciar(async () => {
      const resultado = await assumirFicha({ demandaId });
      mostrarFeedback(resultado);
      if (resultado.ok) router.refresh();
    });
  }

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="fila-compartilhada">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--texto-suave)]">
            Fila compartilhada
          </p>
          <h2 id="fila-compartilhada" className="text-base font-semibold text-[var(--texto-forte)]">
            Demandas disponíveis
          </h2>
          <p className="text-sm text-[var(--texto-suave)]">Escolha uma tarefa sem precisar aguardar um administrador.</p>
        </div>
        <p className="text-sm text-[var(--texto-suave)]">
          <span className="fonte-numero text-xl font-semibold text-[var(--texto-forte)]">∞</span>
          {' '}sem limite
          <span className="mt-1 block text-xs">
            {ocupadas} {ocupadas === 1 ? 'demanda atual' : 'demandas atuais'}
          </span>
        </p>
      </div>
      {itens.length === 0 ? (
        <EstadoVazio icone={Inbox} titulo="Nenhuma demanda aguardando editor neste momento." className="py-6" />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {itens.map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 flex-col gap-3 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-3 transition-colors duration-150 sm:flex-row sm:items-center"
            >
              <Link
                href={`/demandas/${item.id}`}
                className="min-w-0 flex-1 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--loumar-600)]"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <BadgePrioridade prioridade={item.prioridade} />
                  {item.atrasada && (
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--alerta-atrasada)]">
                      Atrasada
                    </span>
                  )}
                </div>
                <p className="truncate text-sm font-medium text-[var(--texto-forte)]" title={item.titulo}>
                  {item.titulo}
                </p>
                <p className="truncate text-xs text-[var(--texto-suave)]">
                  {item.formato}
                  {item.influencerNome ? ` · ${item.influencerNome}` : ''}
                </p>
                {item.editorSugerido && (
                  <p className="text-xs text-[var(--texto-suave)]">Sugestão: {item.editorSugerido} · não exclusiva</p>
                )}
                <p className="text-xs tabular-nums text-[var(--texto-suave)]">
                  {item.prazo ? formatarData(item.prazo) : 'Sem prazo definido'}
                </p>
              </Link>
              {podeAssumir && (
                <Button type="button" size="sm" disabled={pendente} onClick={() => assumir(item.id)}>
                  Assumir demanda
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
