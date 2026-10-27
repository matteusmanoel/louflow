import { Badge } from '@/components/ui/badge';
import type { StatusCaptacao } from '../consultas';

const VARIANTES: Record<StatusCaptacao, 'prioridade-normal' | 'leitura' | 'prioridade-urgente'> = {
  Agendada:  'prioridade-normal',
  Concluída: 'leitura',
  Cancelada: 'leitura',
};

export function BadgeStatusCaptacao({ status }: { status: StatusCaptacao }) {
  return <Badge variant={VARIANTES[status] ?? 'leitura'}>{status}</Badge>;
}
