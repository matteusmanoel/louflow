import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaAnalista() {
  await exigirModulo('analista');
  return <ModuloReservado slug="analista" />;
}
