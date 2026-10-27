import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EstadoVazioProps {
  /** Ícone Lucide decorativo (ex: Inbox, SearchX, FolderOpen) */
  icone?: LucideIcon;
  /** Título curto — descreve o que está vazio */
  titulo: string;
  /** Texto de apoio opcional — sugere uma ação ou contexto */
  descricao?: string;
  /** Ação principal opcional — ex: botão "Criar demanda" */
  acao?: React.ReactNode;
  className?: string;
}

/**
 * EstadoVazio — componente padrão para telas e seções sem dados.
 * Usar sempre que uma lista, tabela ou seção não tiver resultados.
 * Nunca usar texto "Nenhum resultado" ad hoc nos componentes de fatia.
 */
export function EstadoVazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: EstadoVazioProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-center',
        className
      )}
    >
      {Icone && (
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--raio-card)] bg-[var(--loumar-50)]">
          <Icone className="h-6 w-6 text-[var(--texto-suave)]" aria-hidden />
        </div>
      )}
      <div className="space-y-1">
        <p className="fonte-titulo text-sm font-medium text-[var(--texto-forte)]">{titulo}</p>
        {descricao && (
          <p className="text-xs text-[var(--texto-suave)] max-w-xs">{descricao}</p>
        )}
      </div>
      {acao && <div className="mt-1">{acao}</div>}
    </div>
  );
}
