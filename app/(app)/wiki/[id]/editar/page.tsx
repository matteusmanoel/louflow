import { notFound, redirect } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import { obterArtigoWiki } from '@/features/wiki/consultas';
import { FormularioArtigo } from '@/features/wiki/components/FormularioArtigo';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function PaginaEditarArtigoWiki({ params }: Props) {
  const usuario = await exigirModulo('wiki');
  if (usuario.perfil !== 'Administrador') redirect('/wiki');

  const { id } = await params;
  const artigo = await obterArtigoWiki(id, usuario.perfil);
  if (!artigo) notFound();

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina grupo="Acompanhamento" titulo="Editar artigo" />
      <FormularioArtigo
        modo="editar"
        id={artigo.id}
        valorInicial={{
          category: artigo.category,
          title: artigo.title,
          summary: artigo.summary ?? '',
          content: artigo.content,
          position: artigo.position,
          is_published: artigo.is_published,
        }}
      />
    </ContainerPagina>
  );
}
