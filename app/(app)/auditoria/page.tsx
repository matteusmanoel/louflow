import { exigirModulo } from '@/lib/auth';
import { ModuloReservado } from '@/components/ModuloReservado';

export default async function PaginaAuditoria() {
  await exigirModulo('auditoria');
  return <ModuloReservado slug="auditoria" />;
}
