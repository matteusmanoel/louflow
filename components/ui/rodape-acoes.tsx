import type { ReactNode } from 'react';

/**
 * Rodapé único de formulário, Dialog e página de edição.
 * Desktop: destrutiva à esquerda, secundária e primária à direita.
 * Abaixo de 650 px: empilhado, primária em cima.
 */
export function RodapeAcoes({
  secundaria,
  primaria,
  destrutiva,
}: {
  secundaria?: ReactNode;
  primaria: ReactNode;
  destrutiva?: ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-[var(--borda-app)] pt-4 sm:flex-row sm:items-center sm:justify-end">
      {destrutiva && <div className="sm:mr-auto">{destrutiva}</div>}
      {secundaria}
      {primaria}
    </div>
  );
}
