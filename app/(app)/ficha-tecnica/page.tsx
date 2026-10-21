import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaFichaTecnica() {
  await exigirModulo('ficha-tecnica');
  return <ModuloReservado slug="ficha-tecnica" />;
}
