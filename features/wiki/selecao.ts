export const TITULO_GUIA_WIKI = 'Como usar este guia';

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
