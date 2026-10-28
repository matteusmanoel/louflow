import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import type { ArtigoWiki } from '../consultas';
import { BotaoPublicacao } from './BotaoPublicacao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EstadoVazio } from '@/components/ui/estado-vazio';

function agrupar(artigos: ArtigoWiki[]): { categoria: string; artigos: ArtigoWiki[] }[] {
  const grupos: { categoria: string; artigos: ArtigoWiki[] }[] = [];
  for (const artigo of artigos) {
    const atual = grupos.find((grupo) => grupo.categoria === artigo.category);
    if (atual) atual.artigos.push(artigo);
    else grupos.push({ categoria: artigo.category, artigos: [artigo] });
  }
  return grupos;
}

export function ListaArtigos({ artigos, podeGerir }: { artigos: ArtigoWiki[]; podeGerir: boolean }) {
  if (artigos.length === 0) {
    return (
      <EstadoVazio
        icone={BookOpen}
        titulo={podeGerir ? 'Nenhum artigo na Wiki' : 'Nenhum artigo publicado'}
        descricao={
          podeGerir
            ? 'Crie um artigo para a equipe consultar as rotinas.'
            : 'Quando um administrador publicar um artigo, ele aparece aqui.'
        }
        acao={
          podeGerir ? (
            <Button asChild>
              <Link href="/wiki/novo">Novo artigo</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      {agrupar(artigos).map((grupo) => (
        <section key={grupo.categoria} className="grid min-w-0 gap-3">
          <h2 className="text-sm font-semibold text-[var(--texto-forte)]">{grupo.categoria}</h2>
          <ul className="grid min-w-0 gap-3">
            {grupo.artigos.map((artigo) => (
              <li
                key={artigo.id}
                className="min-w-0 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-4 shadow-[var(--sombra-card)]"
              >
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/wiki/${artigo.id}`}
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
