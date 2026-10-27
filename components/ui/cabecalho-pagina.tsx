import type { ReactNode } from 'react';

/**
 * Cabeçalho de página. O título é o único h1 do destino.
 */
export function CabecalhoPagina({
  grupo,
  titulo,
  descricao,
  acao,
  extra,
}: {
  grupo?: string;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {grupo && (
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--texto-suave)]">
            {grupo}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-[var(--texto-forte)]">{titulo}</h1>
          {extra}
        </div>
        {descricao && <p className="mt-1 max-w-2xl text-sm text-[var(--texto-suave)]">{descricao}</p>}
      </div>
      {acao && <div className="flex flex-wrap items-center gap-2">{acao}</div>}
    </header>
  );
}
