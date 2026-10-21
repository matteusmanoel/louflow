import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaFichas() {
  await exigirModulo('fichas');
  return <ModuloReservado slug="fichas" />;
}
