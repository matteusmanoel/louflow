import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaSorteios() {
  await exigirModulo('sorteios');
  return <ModuloReservado slug="sorteios" />;
}
