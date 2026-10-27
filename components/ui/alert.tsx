import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-[var(--raio-card)] border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-[var(--foreground)] [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--card)] text-[var(--card-foreground)] border-[var(--border)]',
        destructive:
          'border-[var(--alerta-atrasada)]/50 text-[var(--alerta-atrasada)] [&>svg]:text-[var(--alerta-atrasada)] bg-[var(--alerta-atrasada-fundo)]',
        warning:
          'border-[var(--alerta-hoje)]/50 text-[var(--alerta-hoje)] [&>svg]:text-[var(--alerta-hoje)] bg-[var(--alerta-hoje-fundo)]',
        info:
          'border-[var(--loumar-600)]/50 text-[var(--loumar-700)] [&>svg]:text-[var(--loumar-700)] bg-[var(--loumar-50)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-xs [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
