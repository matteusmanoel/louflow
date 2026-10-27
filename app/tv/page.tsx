import { paraDtoTv, type PayloadTv } from '@/lib/tv';
import { obterDadosPainelTv } from '@/features/tv/consultas';
import { PainelTv } from '@/features/tv/components/PainelTv';

export const dynamic = 'force-dynamic';

/** Primeira pintura no servidor; o cliente só busca de novo no fim de cada ciclo. */
export default async function PaginaTv() {
  let inicial: PayloadTv | null = null;
  try {
    inicial = paraDtoTv(await obterDadosPainelTv());
  } catch {
    inicial = null;
  }
  return <PainelTv inicial={inicial} />;
}
