import { redirect } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import { listarArtigosWiki } from '@/features/wiki/consultas';
import { FormularioArtigo } from '@/features/wiki/components/FormularioArtigo';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export const dynamic = 'force-dynamic';

export default async function PaginaNovoArtigoWiki() {
  const usuario = await exigirModulo('wiki');
  if (usuario.perfil !== 'Administrador') redirect('/wiki');

  const artigos = await listarArtigosWiki(usuario.perfil);
  const ordemSugerida = Math.min(999, artigos.reduce((maior, artigo) => Math.max(maior, artigo.position), 0) + 1);

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina grupo="Acompanhamento" titulo="Novo artigo" descricao="O rascunho fica visível só para administradores." />
      <FormularioArtigo modo="novo" ordemSugerida={ordemSugerida} />
    </ContainerPagina>
  );
}
