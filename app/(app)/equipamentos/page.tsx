import { redirect } from 'next/navigation';
import { ROTA_CATALOGO } from '@/features/equipamentos/catalogo';

export default function PaginaEquipamentos() {
  redirect(ROTA_CATALOGO);
}
