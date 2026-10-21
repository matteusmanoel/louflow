import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaAprovacoes() {
  await exigirModulo('aprovacoes');
  return <ModuloReservado slug="aprovacoes" />;
}
