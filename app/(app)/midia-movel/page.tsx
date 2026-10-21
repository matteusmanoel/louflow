import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaMidiaMovel() {
  await exigirModulo('midia-movel');
  return <ModuloReservado slug="midia-movel" />;
}
