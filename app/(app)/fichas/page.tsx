import { exigirModulo } from '@/lib/auth';
import { carregarFilaDeFichasPagina } from '@/features/demandas/consultas';
import { FilaDeFichas } from '@/features/demandas/components/FilaDeFichas';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export const dynamic = 'force-dynamic';

export default async function PaginaFilaDeFichas() {
  await exigirModulo('fichas');
  const demandas = await carregarFilaDeFichasPagina();

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Produção"
        titulo="Fila de Fichas"
        descricao="Demandas aguardando Editor. Assuma para começar."
      />
      <FilaDeFichas demandas={demandas} />
    </ContainerPagina>
  );
}
