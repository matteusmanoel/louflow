import { VistaDemanda } from '@/features/demandas/components/VistaDemanda';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
};

export default async function PaginaDetalhe({ params, searchParams }: Props) {
  const { id } = await params;
  const { aba } = await searchParams;
  return <VistaDemanda id={id} variante="pagina" aba={aba} />;
}
