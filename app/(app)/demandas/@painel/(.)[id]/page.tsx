import { VistaDemanda } from '@/features/demandas/components/VistaDemanda';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
};

export default async function PainelDetalhe({ params, searchParams }: Props) {
  const { id } = await params;
  const { aba } = await searchParams;
  // Na navegação a partir da lista o segmento chega com o marcador da interceptação.
  const idDemanda = id.replace(/^(?:\(\.\))+/u, '');
  return <VistaDemanda id={idDemanda} variante="modal" aba={aba} />;
}
