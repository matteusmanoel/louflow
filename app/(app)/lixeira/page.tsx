import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaLixeira() {
  await exigirModulo('lixeira');
  return <ModuloReservado slug="lixeira" />;
}
