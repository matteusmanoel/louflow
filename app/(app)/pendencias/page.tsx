import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaPendencias() {
  await exigirModulo('pendencias');
  return <ModuloReservado slug="pendencias" />;
}
