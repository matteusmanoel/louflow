import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaPreferencias() {
  await exigirModulo('preferencias');
  return <ModuloReservado slug="preferencias" />;
}
