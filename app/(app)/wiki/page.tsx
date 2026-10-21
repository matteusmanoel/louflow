import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaWiki() {
  await exigirModulo('wiki');
  return <ModuloReservado slug="wiki" />;
}
