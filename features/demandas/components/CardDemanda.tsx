import Link from 'next/link';
import { CalendarDays, Pencil, User } from 'lucide-react';
import type { Demanda } from '../consultas';
import { BadgePrioridade } from './BadgePrioridade';
import { BadgeStatus } from './BadgeStatus';
import { cn } from '@/lib/utils';

function formatarData(valor: string | null): string {
  if (!valor) return '—';
  const [ano, mes, dia] = valor.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function CardDemanda({ demanda }: { demanda: Demanda }) {
  const prazoFormatado = formatarData(demanda.prazo_efetivo);

  return (
    <Link
      href={`/demandas/${demanda.id}`}
      className={cn(
        'rounded-[var(--raio-card)] border bg-[var(--superficie)] p-4 shadow-[var(--sombra-card)]',
        'flex flex-col gap-2 no-underline',
        demanda.atrasada
          ? 'border-[var(--alerta-atrasada)] bg-[var(--linha-atrasada-fundo)]'
          : 'border-[var(--borda-app)]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'fonte-titulo flex-1 text-sm font-semibold leading-snug',
            demanda.atrasada ? 'text-[var(--alerta-atrasada)]' : 'text-[var(--texto-forte)]',
          )}
        >
          {demanda.title}
        </span>
        <BadgePrioridade prioridade={demanda.priority} />
      </div>

      {/* Status + formato */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <BadgeStatus status={demanda.status} />
        <span className="text-[11px] text-[var(--texto-suave)]">{demanda.format}</span>
      </div>

      {/* Metadados */}
      <div className="flex flex-wrap gap-3 text-[11px] text-[var(--texto-suave)]">
        {demanda.editor_label || demanda.editor_nome ? (
          <span className="flex items-center gap-1">
            <Pencil className="h-3 w-3" aria-hidden />
            {demanda.editor_label ?? demanda.editor_nome}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[var(--alerta-hoje)]">
            <Pencil className="h-3 w-3" aria-hidden />
            A definir
          </span>
        )}

        {demanda.influencer_nome && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" aria-hidden />
            {demanda.influencer_nome}
          </span>
        )}

        {demanda.prazo_efetivo && (
          <span
            className={cn(
              'flex items-center gap-1',
              demanda.atrasada && 'text-[var(--alerta-atrasada)] font-semibold'
            )}
          >
            <CalendarDays className="h-3 w-3" aria-hidden />
            <span className="fonte-numero">{prazoFormatado}</span>
            {demanda.atrasada && ' · ATRASADA'}
          </span>
        )}
      </div>
    </Link>
  );
}
