import { FormularioDemandaPagina } from '@/features/demandas/components/FormularioDemandaPagina';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function PainelEditar({ params }: Props) {
  const { id } = await params;
  const idDemanda = id.replace(/^(?:\(\.\))+/u, '');
  return <FormularioDemandaPagina variante="modal" id={idDemanda} />;
}
