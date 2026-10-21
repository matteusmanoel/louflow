import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaRelatorio() {
  await exigirModulo('relatorio');
  return <ModuloReservado slug="relatorio" />;
}
