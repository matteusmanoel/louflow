'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { CalendarDays, User, Loader2, InboxIcon } from 'lucide-react';
import type { Demanda } from '../consultas';
import { assumirFicha } from '../actions';
import { BadgePrioridade } from './BadgePrioridade';
import { Button } from '@/components/ui/button';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { mostrarFeedback } from '@/lib/toast';

function formatarData(valor: string | null): string {
  if (!valor) return '—';
  const [ano, mes, dia] = valor.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function FilaDeFichas({ demandas }: { demandas: Demanda[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleAssumir(demandaId: string) {
    startTransition(async () => {
      const resultado = await assumirFicha({ demandaId });
      mostrarFeedback(resultado);
      if (resultado.ok) {
        router.refresh();
      }
    });
  }

  if (demandas.length === 0) {
    return (
      <EstadoVazio
        icone={InboxIcon}
        titulo="Fila de Fichas vazia"
        descricao="Nenhuma demanda aguarda Editor no momento."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {demandas.map((d) => (
        <article
          key={d.id}
          className="flex items-center gap-4 flex-wrap rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] shadow-[var(--sombra-card)] p-4"
        >
          <div className="flex-1 min-w-[200px]">
            <div className="fonte-titulo font-semibold text-sm text-[var(--texto-forte)]">{d.title}</div>
            <div className="flex gap-3 text-[11px] text-[var(--texto-suave)] mt-1 flex-wrap">
              <span>{d.format}</span>
              {d.influencer_nome && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" aria-hidden />
                  {d.influencer_nome}
                </span>
              )}
              {d.prazo_efetivo && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" aria-hidden />
                  <span className="fonte-numero">{formatarData(d.prazo_efetivo)}</span>
                </span>
              )}
            </div>
          </div>

          <BadgePrioridade prioridade={d.priority} />

          <Button
            type="button"
            onClick={() => void handleAssumir(d.id)}
            disabled={isPending}
            size="sm"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            Assumir
          </Button>
        </article>
      ))}
    </div>
  );
}
