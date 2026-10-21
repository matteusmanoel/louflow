import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaCortes() {
  await exigirModulo('cortes');
  return <ModuloReservado slug="cortes" />;
}
