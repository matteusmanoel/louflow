import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaAgenda() {
  await exigirModulo('agenda');
  return <ModuloReservado slug="agenda" />;
}
