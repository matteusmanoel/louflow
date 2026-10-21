import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaRanking() {
  await exigirModulo('ranking');
  return <ModuloReservado slug="ranking" />;
}
