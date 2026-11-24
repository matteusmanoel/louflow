import { describe, expect, it } from 'vitest';
import { descreverLinkEntrega, linkParaCartao } from './link-entrega';

describe('link da entrega no cartão de aprovação', () => {
  it('descreve link https com domínio e caminho, sem www', () => {
    expect(descreverLinkEntrega('https://www.exemplo.test/pasta/entrega-v1.mp4')).toEqual({
      href: 'https://www.exemplo.test/pasta/entrega-v1.mp4',
      rotulo: 'exemplo.test/pasta/entrega-v1.mp4',
    });
    expect(descreverLinkEntrega('  http://exemplo.test/ ')?.rotulo).toBe('exemplo.test');
  });

  it('encurta rótulos longos', () => {
    const rotulo = descreverLinkEntrega(`https://exemplo.test/${'a'.repeat(100)}`)?.rotulo ?? '';
    expect(rotulo).toHaveLength(60);
    expect(rotulo.endsWith('…')).toBe(true);
  });

  it('recusa esquemas perigosos, texto solto e vazio', () => {
    for (const valor of ['javascript:alert(1)', 'data:text/html,<b>x</b>', 'ftp://exemplo.test/a', 'sem link', '', '   ', null, undefined]) {
      expect(descreverLinkEntrega(valor)).toBeNull();
    }
  });

  it('não repete o link quando a entrega já lista o arquivo enviado', () => {
    const link = 'https://exemplo.test/arquivos/entrega.mp4';
    expect(linkParaCartao(link, [link])).toBeNull();
    expect(linkParaCartao(link, [])?.rotulo).toBe('exemplo.test/arquivos/entrega.mp4');
    expect(linkParaCartao('chave/interna.mp4', [], 'https://assinado.test/x?sig=1')?.href).toBe('https://assinado.test/x?sig=1');
  });
});
