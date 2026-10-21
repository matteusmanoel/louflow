import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaDashboard() {
  await exigirModulo('dashboard');
  return <ModuloReservado slug="dashboard" />;
}
