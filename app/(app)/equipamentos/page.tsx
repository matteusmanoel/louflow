import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaEquipamentos() {
  await exigirModulo('equipamentos');
  return <ModuloReservado slug="equipamentos" />;
}
