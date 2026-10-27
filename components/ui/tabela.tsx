import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** A tabela rola aqui. A largura mínima fica na <table>, nunca na página. */
export function TabelaWrapper({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'min-w-0 overflow-x-auto rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)]',
        className,
      )}
      {...props}
    />
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'whitespace-nowrap bg-[var(--tabela-cabecalho-fundo)] px-3 py-2 text-left text-[11px] font-extrabold uppercase tracking-[0.045em] text-[var(--tabela-cabecalho-texto)]',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('border-t border-[var(--tabela-linha-borda)] px-3 py-2.5 align-middle text-[var(--texto-forte)]', className)}
      {...props}
    />
  );
}

export const classeColunaAcoes =
  'sticky right-0 w-12 bg-[var(--superficie)] text-right';
