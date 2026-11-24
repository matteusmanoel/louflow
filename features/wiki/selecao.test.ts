import { describe, expect, it } from 'vitest';
import { ID_CATALOGO_WIKI, ROTA_CATALOGO } from '@/features/equipamentos/catalogo';
import { escolherArtigoWiki, pedidoEhCatalogo } from './selecao';

const artigos = [
  { id: 'wiki-02', title: 'Fichas técnicas e materiais' },
  { id: 'wiki-01', title: 'Como usar este guia' },
  { id: 'wiki-03', title: 'Edição, pausas e versões' },
];

describe('escolherArtigoWiki', () => {
  it('abre o id pedido quando ele está na lista', () => {
    expect(escolherArtigoWiki(artigos, 'wiki-03')?.id).toBe('wiki-03');
  });

  it('abre Como usar este guia quando não há pedido válido', () => {
    expect(escolherArtigoWiki(artigos)?.id).toBe('wiki-01');
    expect(escolherArtigoWiki(artigos, 'inexistente')?.id).toBe('wiki-01');
  });

  it('trata o catálogo como seção fixa, fora dos artigos', () => {
    expect(ID_CATALOGO_WIKI).toBe('equipamentos');
    expect(ROTA_CATALOGO).toBe('/wiki?artigo=equipamentos');
    expect(pedidoEhCatalogo('equipamentos')).toBe(true);
    expect(pedidoEhCatalogo('wiki-01')).toBe(false);
    expect(escolherArtigoWiki(artigos, 'equipamentos')?.id).toBe('wiki-01');
  });

  it('abre o primeiro quando o guia não está na lista', () => {
    const semGuia = artigos.filter((artigo) => artigo.id !== 'wiki-01');
    expect(escolherArtigoWiki(semGuia)?.id).toBe('wiki-02');
    expect(escolherArtigoWiki([])).toBeNull();
  });
});
