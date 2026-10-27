import { FormularioDemandaPagina } from '@/features/demandas/components/FormularioDemandaPagina';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function PaginaEditarDemanda({ params }: Props) {
  const { id } = await params;
  return <FormularioDemandaPagina variante="pagina" id={id} />;
}
