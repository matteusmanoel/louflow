import Link from 'next/link';
import { Plus } from 'lucide-react';
import { exigirModulo } from '@/lib/auth';
import { listarArtigosWiki, veRascunhosWiki } from '@/features/wiki/consultas';
import { ListaArtigos } from '@/features/wiki/components/ListaArtigos';
import { Button } from '@/components/ui/button';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export const dynamic = 'force-dynamic';

export default async function PaginaWiki() {
  const usuario = await exigirModulo('wiki');
  const artigos = await listarArtigosWiki(usuario.perfil);
  const podeGerir = veRascunhosWiki(usuario.perfil);

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
      <ListaArtigos artigos={artigos} podeGerir={podeGerir} />
    </ContainerPagina>
  );
}
