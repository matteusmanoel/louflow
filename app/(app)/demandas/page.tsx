import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaDemandas() {
  await exigirModulo('demandas');
  return <ModuloReservado slug="demandas" />;
}
