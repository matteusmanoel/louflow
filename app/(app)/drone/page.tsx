import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaDrone() {
  await exigirModulo('drone');
  return <ModuloReservado slug="drone" />;
}
