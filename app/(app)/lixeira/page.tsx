import { exigirModulo } from '@/lib/auth';
import { listarLixeira } from '@/features/lixeira/consultas';
import { TabelaLixeira } from '@/features/lixeira/components/TabelaLixeira';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export const dynamic = 'force-dynamic';

export default async function PaginaLixeira() {
  const usuario = await exigirModulo('lixeira');
  const demandas = await listarLixeira();

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Administração"
        titulo="Lixeira"
        descricao="Demandas excluídas. Restaure ou exclua definitivamente."
      />
      <TabelaLixeira demandas={demandas} podeGerenciar={usuario.permissoes.gerenciarUsuarios} />
    </ContainerPagina>
  );
}
