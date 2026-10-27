import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'fonte-ui inline-flex items-center rounded-[var(--raio-pilula)] border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]',
        secondary:
          'border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]',
        outline:
          'border-[var(--border)] text-[var(--foreground)]',
        destructive:
          'border-transparent bg-[var(--alerta-atrasada-fundo)] text-[var(--alerta-atrasada)]',
        warning:
          'border-transparent bg-[var(--alerta-hoje-fundo)] text-[var(--alerta-hoje)]',
        /* Prioridades */
        'prioridade-baixa':
          'border-transparent bg-[var(--prioridade-baixa-fundo)] text-[var(--prioridade-baixa-texto)]',
        'prioridade-normal':
          'border-transparent bg-[var(--prioridade-normal-fundo)] text-[var(--prioridade-normal-texto)]',
        'prioridade-alta':
          'border-transparent bg-[var(--prioridade-alta-fundo)] text-[var(--prioridade-alta-texto)]',
        'prioridade-urgente':
          'border-transparent bg-[var(--prioridade-urgente-fundo)] text-[var(--prioridade-urgente-texto)]',
        /* Aprovação */
        'aprovacao':
          'border-[var(--chip-aprovacao-borda)] bg-[var(--chip-aprovacao-fundo)] text-[var(--chip-aprovacao-texto)]',
        'leitura':
          'border-[var(--chip-leitura-borda)] bg-[var(--chip-leitura-fundo)] text-[var(--chip-leitura-texto)]',
        /* Situação de registro (Ativo, PIN pendente, inativo). O texto carrega o significado. */
        'situacao-ativo':
          'border-transparent bg-[var(--prioridade-normal-fundo)] text-[var(--prioridade-normal-texto)]',
        'situacao-pendente':
          'border-transparent bg-[var(--prioridade-alta-fundo)] text-[var(--prioridade-alta-texto)]',
        'situacao-inativo':
          'border-[var(--chip-leitura-borda)] bg-[var(--chip-leitura-fundo)] text-[var(--chip-leitura-texto)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

export { Badge, badgeVariants };
