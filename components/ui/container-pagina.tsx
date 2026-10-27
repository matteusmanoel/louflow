import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Conteúdo da página. Nunca renderiza <main>: o AppShell já tem o único main.
 * `formulario` é max-w-3xl alinhado à esquerda, para o título casar com o das listas.
 */
export function ContainerPagina({
  largura = 'total',
  children,
  className,
}: {
  largura?: 'total' | 'formulario';
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4', largura === 'formulario' && 'max-w-3xl', className)}>
      {children}
    </section>
  );
}
