import Link from 'next/link';
import { CalendarDays, Pencil, User } from 'lucide-react';
import type { Demanda } from '../consultas';
import { BadgePrioridade } from './BadgePrioridade';
import { BadgeStatus } from './BadgeStatus';
import { formatarData } from '@/lib/datas';
import { cn } from '@/lib/utils';

/** Lista de Demandas no mobile. A tabela e o quadro ficam no desktop. */
export function CardDemanda({ demanda }: { demanda: Demanda }) {
  const editor = demanda.editor_label ?? demanda.editor_nome;
  return (
    <Link
      href={`/demandas/${demanda.id}`}
      className={cn(
        'flex flex-col gap-2 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-3 no-underline shadow-[var(--sombra-card)]',
        demanda.atrasada && 'border-[var(--alerta-atrasada)] bg-[var(--linha-atrasada-fundo)]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'text-sm font-semibold',
            demanda.atrasada ? 'text-[var(--alerta-atrasada)]' : 'text-[var(--texto-forte)]',
          )}
        >
          {demanda.title}
        </span>
        <BadgePrioridade prioridade={demanda.priority} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <BadgeStatus status={demanda.status} />
        <span className="text-xs text-[var(--texto-suave)]">{demanda.format}</span>
      </div>
      <div className="flex flex-col gap-1 text-xs text-[var(--texto-suave)]">
        <span className="inline-flex items-center gap-1.5">
          <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {editor ?? <span className="text-[var(--alerta-hoje)]">A definir</span>}
        </span>
        {demanda.influencer_nome && (
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {demanda.influencer_nome}
          </span>
        )}
        {demanda.prazo_efetivo && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5',
              demanda.atrasada && 'font-semibold text-[var(--alerta-atrasada)]',
            )}
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {formatarData(demanda.prazo_efetivo)}
            {demanda.atrasada ? ' · Atrasada' : ''}
          </span>
        )}
      </div>
    </Link>
  );
}
