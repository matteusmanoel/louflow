import { Badge } from '@/components/ui/badge';
import type { DemandaPrioridade } from '../consultas';

const VARIANTES = {
  Baixa:   'prioridade-baixa',
  Normal:  'prioridade-normal',
  Alta:    'prioridade-alta',
  Urgente: 'prioridade-urgente',
} as const;

export function BadgePrioridade({ prioridade }: { prioridade: DemandaPrioridade }) {
  return (
    <Badge variant={VARIANTES[prioridade]}>
      {prioridade}
    </Badge>
  );
}
