import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('./actions', () => ({ aprovarEntrega: vi.fn(), reprovarEntrega: vi.fn() }));
vi.mock('@/features/instagram/actions', () => ({ agendarPublicacaoInstagram: vi.fn() }));

const { ListaAprovacoes } = await import('./components/ListaAprovacoes');

const base = {
  entregaId: 'Dqa1',
  demandaId: 'LFqa1',
  demandaTitulo: 'Reels de teste',
  versao: 1,
  editorNome: 'Editor Teste',
  nota: 'Primeira versão.',
  podeAjustar: true,
  podeAgendar: false,
  arquivos: [],
};

function renderizar(link: { href: string; rotulo: string } | null) {
  return renderToStaticMarkup(createElement(ListaAprovacoes, { itens: [{ ...base, link }], contas: [] }));
}

describe('cartão de aprovação', () => {
  it('entrega só por link mostra o link com domínio e abre em nova aba com rel seguro', () => {
    const html = renderizar({ href: 'https://exemplo.test/qa/entrega-v1', rotulo: 'exemplo.test/qa/entrega-v1' });
    expect(html).toContain('href="https://exemplo.test/qa/entrega-v1"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('exemplo.test/qa/entrega-v1');
    expect(html).toContain('Aprovar');
  });

  it('sem link (arquivo enviado ou endereço inválido) não renderiza o bloco de link', () => {
    expect(renderizar(null)).not.toContain('Abrir entrega');
  });
});
