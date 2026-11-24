import Link from 'next/link';
import type { ArtigoWikiDetalhe } from '../consultas';
import { BotaoPublicacao } from './BotaoPublicacao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatarDataHora } from '@/lib/datas';

export function PainelArtigo({ artigo, podeGerir }: { artigo: ArtigoWikiDetalhe; podeGerir: boolean }) {
  const paragrafos = artigo.content
    .split(/\n{2,}/)
    .map((trecho) => trecho.trim())
    .filter(Boolean);

  return (
    <article className="grid min-w-0 gap-4 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-5 shadow-[var(--sombra-card)]">
      <header className="grid min-w-0 gap-2">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="outline">{artigo.category}</Badge>
            <h2 className="mt-2 text-xl font-semibold text-[var(--texto-forte)]">{artigo.title}</h2>
            {artigo.summary && <p className="mt-1 text-sm text-[var(--texto-suave)]">{artigo.summary}</p>}
          </div>
          {podeGerir && (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/wiki/${artigo.id}/editar`}>Editar</Link>
              </Button>
              <BotaoPublicacao id={artigo.id} publicado={artigo.is_published} />
            </div>
          )}
        </div>
      </header>
      {paragrafos.map((paragrafo, indice) => (
        <p key={indice} className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--texto-forte)]">
          {paragrafo}
        </p>
      ))}
      <p className="text-xs text-[var(--texto-suave)]">Atualizado em {formatarDataHora(artigo.updated_at)}</p>
    </article>
  );
}
