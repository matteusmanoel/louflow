import { Badge } from '@/components/ui/badge';
import type { DemandaStatus } from '../consultas';

type VarianteBadge =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'leitura'
  | 'aprovacao'
  | 'prioridade-normal'
  | 'prioridade-alta'
  | 'prioridade-urgente';

const VARIANTES: Record<DemandaStatus, VarianteBadge> = {
  'Não iniciada':       'leitura',
  'Em execução':        'prioridade-normal',
  'Pausada':            'prioridade-alta',
  'Aprovação':          'aprovacao',
  'Ajustes solicitados':'prioridade-urgente',
  'Concluída':          'secondary',
  'Reprovada':          'prioridade-urgente',
  'Cancelada':          'leitura',
};

export function BadgeStatus({ status }: { status: DemandaStatus }) {
  return (
    <Badge variant={VARIANTES[status]}>
      {status}
    </Badge>
  );
}
