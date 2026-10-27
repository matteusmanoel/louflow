import { exigirModulo } from '@/lib/auth';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export const dynamic = 'force-dynamic';

export default async function PaginaFichaTecnica() {
  const usuario = await exigirModulo('ficha-tecnica');

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina grupo="Produção" titulo="Ficha Técnica" />
      <p className="text-sm text-[var(--texto-suave)]">
        {usuario.permissoes.editarDemandas
          ? 'Para editar a Ficha Técnica de uma Demanda, acesse o detalhe da Demanda e utilize a seção Ficha Técnica.'
          : 'Para visualizar ou preencher a Ficha Técnica, acesse o detalhe da Demanda correspondente.'}
      </p>
    </ContainerPagina>
  );
}
