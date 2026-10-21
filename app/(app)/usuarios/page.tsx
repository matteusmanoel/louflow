import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaUsuarios() {
  await exigirModulo('usuarios');
  return <ModuloReservado slug="usuarios" />;
}
