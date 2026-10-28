import Link from 'next/link';
import { notFound } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import { obterArtigoWiki, veRascunhosWiki } from '@/features/wiki/consultas';
import { BotaoPublicacao } from '@/features/wiki/components/BotaoPublicacao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';
import { formatarDataHora } from '@/lib/datas';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function PaginaArtigoWiki({ params }: Props) {
  const usuario = await exigirModulo('wiki');
  const { id } = await params;
  const artigo = await obterArtigoWiki(id, usuario.perfil);
  if (!artigo) notFound();

  const podeGerir = veRascunhosWiki(usuario.perfil);
  const paragrafos = artigo.content.split(/\n{2,}/).map((trecho) => trecho.trim()).filter(Boolean);

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina
        grupo="Acompanhamento"
        titulo={artigo.title}
        descricao={artigo.summary ?? undefined}
        extra={<Badge variant="outline">{artigo.category}</Badge>}
        acao={
          <>
            <Button asChild variant="outline">
              <Link href="/wiki">Voltar</Link>
            </Button>
            {podeGerir && (
              <>
                <Button asChild variant="outline">
                  <Link href={`/wiki/${artigo.id}/editar`}>Editar</Link>
                </Button>
                <BotaoPublicacao id={artigo.id} publicado={artigo.is_published} />
              </>
            )}
          </>
        }
      />
      <article className="grid gap-4 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-5 shadow-[var(--sombra-card)]">
        {paragrafos.map((paragrafo, indice) => (
          <p key={indice} className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--texto-forte)]">
            {paragrafo}
          </p>
        ))}
        <p className="text-xs text-[var(--texto-suave)]">Atualizado em {formatarDataHora(artigo.updated_at)}</p>
      </article>
    </ContainerPagina>
  );
}
