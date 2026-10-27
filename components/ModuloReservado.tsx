import { modulo } from '@/lib/modules';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

/** Placeholder da rota reservada. A fatia dona substitui o conteúdo de `app/(app)/<slug>/page.tsx`. */
export function ModuloReservado({ slug }: { slug: string }) {
  const m = modulo(slug);
  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina grupo="Em breve" titulo={m?.rotulo ?? slug} descricao="Módulo em construção." />
    </ContainerPagina>
  );
}
