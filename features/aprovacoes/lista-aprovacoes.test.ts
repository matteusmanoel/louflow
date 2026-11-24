// @vitest-environment jsdom
import { createElement, useState, type ReactNode } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => atualizarAposRefresh() }) }));
vi.mock('./actions', () => ({ aprovarEntrega: vi.fn(), reprovarEntrega: vi.fn() }));
vi.mock('@/features/instagram/actions', () => ({ agendarPublicacaoInstagram: vi.fn() }));
vi.mock('@/lib/toast', () => ({ mostrarFeedback: vi.fn() }));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    (open ? createElement('div', { role: 'dialog' }, children) : null),
  DialogContent: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  DialogHeader: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  DialogFooter: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  DialogTitle: ({ children }: { children: ReactNode }) => createElement('h2', null, children),
  DialogDescription: ({ children }: { children: ReactNode }) => createElement('p', null, children),
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  SelectTrigger: ({ children }: { children: ReactNode }) => createElement('button', { type: 'button' }, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) => createElement('span', null, placeholder),
  SelectContent: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => createElement('div', { 'data-value': value }, children),
}));

let atualizarAposRefresh: () => void = () => undefined;

const { ListaAprovacoes } = await import('./components/ListaAprovacoes');
const { aprovarEntrega } = await import('./actions');

const base = {
  entregaId: 'Dqa1',
  demandaId: 'LFqa1',
  demandaTitulo: 'Reels de teste',
  versao: 1,
  editorNome: 'Editor Teste',
  nota: 'Primeira versão.',
  podeAjustar: true,
  podeAgendar: false,
  arquivos: [] as { id: string; nome: string; url: string; mime: string | null }[],
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

describe('modal de agendamento após aprovar', () => {
  let raiz: Root;
  let container: HTMLDivElement;

  afterEach(() => {
    atualizarAposRefresh = () => undefined;
    act(() => raiz.unmount());
    container.remove();
  });

  it('com uma única entrega pendente, aprovar mantém o modal de agendamento aberto e utilizável', async () => {
    vi.mocked(aprovarEntrega).mockResolvedValue({ ok: true, mensagem: 'Entrega aprovada.', dados: { demandaId: 'LFqa1', titulo: 'Reels de teste' } });

    const item = {
      ...base,
      podeAgendar: true,
      arquivos: [{ id: 'Aqa1', nome: 'reels.mp4', url: 'https://exemplo.test/reels.mp4', mime: 'video/mp4' }],
      link: null,
    };

    function Painel() {
      const [itens, setItens] = useState([item]);
      atualizarAposRefresh = () => setItens([]);
      return createElement(ListaAprovacoes, { itens, contas: [{ id: 'Cqa1', username: 'loumar.test' }] });
    }

    container = document.createElement('div');
    document.body.append(container);
    raiz = createRoot(container);
    await act(async () => {
      raiz.render(createElement(Painel));
    });

    const botao = Array.from(container.querySelectorAll('button')).find((el) => el.textContent?.includes('Aprovar'));
    expect(botao).toBeDefined();

    await act(async () => {
      botao!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await vi.mocked(aprovarEntrega).mock.results[0]?.value;
    });

    expect(container.textContent).toContain('Agendar publicação');
    expect(container.textContent).toContain('Nenhuma entrega aguardando aprovação');
    const titulo = container.querySelector('#titulo-agenda') as HTMLInputElement | null;
    const quando = container.querySelector('#quando-agenda') as HTMLInputElement | null;
    expect(titulo).not.toBeNull();
    expect(quando).not.toBeNull();
    expect(titulo?.disabled).toBe(false);
    expect(quando?.disabled).toBe(false);
    expect(titulo?.value).toBe('Reels de teste');
    const agendar = Array.from(container.querySelectorAll('button')).find((el) => el.textContent?.includes('Agendar'));
    expect(agendar).toBeDefined();
  });
});
