import Link from 'next/link';
import { ID_CATALOGO_WIKI } from '@/features/equipamentos/catalogo';
import type { ArtigoWiki } from '../consultas';
import { BotaoPublicacao } from './BotaoPublicacao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function agrupar(artigos: ArtigoWiki[]): { categoria: string; artigos: ArtigoWiki[] }[] {
  const grupos: { categoria: string; artigos: ArtigoWiki[] }[] = [];
  for (const artigo of artigos) {
    const atual = grupos.find((grupo) => grupo.categoria === artigo.category);
    if (atual) atual.artigos.push(artigo);
    else grupos.push({ categoria: artigo.category, artigos: [artigo] });
  }
  return grupos;
}

export function ListaArtigos({
  artigos,
  podeGerir,
  selecionadoId,
}: {
  artigos: ArtigoWiki[];
  podeGerir: boolean;
  selecionadoId?: string;
}) {
  return (
    <div className="grid min-w-0 gap-6">
      <section className="grid min-w-0 gap-3">
        <h2 className="text-sm font-semibold text-[var(--texto-forte)]">Recursos</h2>
        <ul className="grid min-w-0 gap-3">
          <li
            className={cn(
              'min-w-0 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-4 shadow-[var(--sombra-card)]',
              selecionadoId === ID_CATALOGO_WIKI && 'border-[var(--loumar-600)] bg-[var(--loumar-100)]',
            )}
          >
            <Link
              href={`/wiki?artigo=${ID_CATALOGO_WIKI}`}
              aria-current={selecionadoId === ID_CATALOGO_WIKI ? 'page' : undefined}
              className="text-base font-semibold text-[var(--texto-forte)] underline-offset-4 hover:underline"
            >
              Catálogo de Equipamentos
            </Link>
            <p className="mt-1 text-sm text-[var(--texto-suave)]">
              Referência visual do que o time tem disponível. Somente leitura.
            </p>
          </li>
        </ul>
      </section>
      {agrupar(artigos).map((grupo) => (
        <section key={grupo.categoria} className="grid min-w-0 gap-3">
          <h2 className="text-sm font-semibold text-[var(--texto-forte)]">{grupo.categoria}</h2>
          <ul className="grid min-w-0 gap-3">
            {grupo.artigos.map((artigo) => (
              <li
                key={artigo.id}
                className={cn(
                  'min-w-0 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-4 shadow-[var(--sombra-card)]',
                  artigo.id === selecionadoId && 'border-[var(--loumar-600)] bg-[var(--loumar-100)]',
                )}
              >
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/wiki?artigo=${encodeURIComponent(artigo.id)}`}
                      aria-current={artigo.id === selecionadoId ? 'page' : undefined}
                      className="text-base font-semibold text-[var(--texto-forte)] underline-offset-4 hover:underline"
                    >
                      {artigo.title}
                    </Link>
                    {artigo.summary && (
                      <p className="mt-1 text-sm text-[var(--texto-suave)]">{artigo.summary}</p>
                    )}
                  </div>
                  {podeGerir && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs tabular-nums text-[var(--texto-suave)]">Ordem {artigo.position}</span>
                      <Badge variant={artigo.is_published ? 'situacao-ativo' : 'situacao-pendente'}>
                        {artigo.is_published ? 'Publicado' : 'Rascunho'}
                      </Badge>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/wiki/${artigo.id}/editar`}>Editar</Link>
                      </Button>
                      <BotaoPublicacao id={artigo.id} publicado={artigo.is_published} />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
