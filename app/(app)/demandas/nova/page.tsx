import { FormularioDemandaPagina } from '@/features/demandas/components/FormularioDemandaPagina';

export const dynamic = 'force-dynamic';

export default async function PaginaNovaDemanda() {
  return <FormularioDemandaPagina variante="pagina" />;
}
