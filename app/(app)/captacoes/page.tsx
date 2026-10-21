import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaCaptacoes() {
  await exigirModulo('captacoes');
  return <ModuloReservado slug="captacoes" />;
}
