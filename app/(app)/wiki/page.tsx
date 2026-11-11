import Link from 'next/link';
import { Plus } from 'lucide-react';
import { exigirModulo } from '@/lib/auth';
import { listarArtigosWiki, obterArtigoWiki, veRascunhosWiki } from '@/features/wiki/consultas';
import { escolherArtigoWiki } from '@/features/wiki/selecao';
import { ListaArtigos } from '@/features/wiki/components/ListaArtigos';
import { PainelArtigo } from '@/features/wiki/components/PainelArtigo';
import { Button } from '@/components/ui/button';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export const dynamic = 'force-dynamic';

type Search = Promise<{ artigo?: string }>;

export default async function PaginaWiki({ searchParams }: { searchParams: Search }) {
  const usuario = await exigirModulo('wiki');
  const { artigo: pedido } = await searchParams;
  const artigos = await listarArtigosWiki(usuario.perfil);
  const podeGerir = veRascunhosWiki(usuario.perfil);
  const escolhido = escolherArtigoWiki(artigos, pedido);
  const detalhe = escolhido ? await obterArtigoWiki(escolhido.id, usuario.perfil) : null;

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Acompanhamento"
        titulo="Wiki"
        descricao="Rotinas e combinados registrados no LouFlow."
        acao={
          podeGerir ? (
            <Button asChild>
              <Link href="/wiki/novo">
                <Plus className="h-4 w-4" aria-hidden />
                Novo artigo
              </Link>
            </Button>
          ) : undefined
        }
      />
      {artigos.length === 0 ? (
        <ListaArtigos artigos={artigos} podeGerir={podeGerir} />
      ) : (
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 min-[981px]:grid-cols-2">
          <div className="min-w-0 min-[981px]:max-h-[calc(100dvh-12rem)] min-[981px]:overflow-y-auto">
            <ListaArtigos artigos={artigos} podeGerir={podeGerir} selecionadoId={detalhe?.id} />
          </div>
          <div className="min-w-0 min-[981px]:max-h-[calc(100dvh-12rem)] min-[981px]:overflow-y-auto">
            {detalhe && <PainelArtigo artigo={detalhe} podeGerir={podeGerir} />}
          </div>
        </div>
      )}
    </ContainerPagina>
  );
}
