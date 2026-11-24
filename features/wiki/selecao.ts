import { ID_CATALOGO_WIKI } from '@/features/equipamentos/catalogo';

export const TITULO_GUIA_WIKI = 'Como usar este guia';

/** O catálogo é seção fixa da Wiki, fora de wiki_articles. */
export function pedidoEhCatalogo(pedido?: string | null): boolean {
  return pedido === ID_CATALOGO_WIKI;
}

/** Pedido visível, senão o guia, senão o primeiro da ordem recebida. */
export function escolherArtigoWiki<T extends { id: string; title: string }>(
  artigos: readonly T[],
  pedido?: string | null,
): T | null {
  if (pedido) {
    const escolhido = artigos.find((artigo) => artigo.id === pedido);
    if (escolhido) return escolhido;
  }
  return artigos.find((artigo) => artigo.title === TITULO_GUIA_WIKI) ?? artigos[0] ?? null;
}
