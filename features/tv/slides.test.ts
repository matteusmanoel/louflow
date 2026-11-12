import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { DemandaTv, PayloadTv } from '@/lib/tv';
import { montarSlides } from './components/Slides';

function payload(demandas: DemandaTv[]): PayloadTv {
  return {
    geradoEm: '2026-11-12T12:00:00.000Z',
    resumoMes: { criadas: 0, concluidas: 0, emAndamento: 0, atrasadas: 0, aguardandoAprovacao: 0, semEditor: 0 },
    demandasPendentes: demandas,
    alertas: { itens: [], totalAtrasadas: 0, totalProximas: 0 },
    aprovacoes: [],
    influencers: [],
    entregas: [],
    agenda: [],
    captacoes: [],
    cortes: [],
    ranking: [],
    produtividade: null,
    cargaEditores: [],
  };
}

function demanda(status: string, diasParaPrazo: number | null): DemandaTv {
  return {
    id: 'LFslide1',
    titulo: `Peça ${status}`,
    formato: 'Reels',
    editor: 'Editor Teste',
    influencer: 'Influencer Teste',
    status,
    prioridade: 'Normal',
    prazo: '2026-11-06',
    diasParaPrazo,
  };
}

function cartaoPendentes(item: DemandaTv): string {
  const slide = montarSlides(payload([item])).find((s) => s.id === 'pendentes');
  expect(slide).toBeDefined();
  return renderToStaticMarkup(createElement(Fragment, null, slide!.conteudo));
}

describe('cartão de demandas pendentes da TV', () => {
  it('prazo vencido em Aprovação não aparece como "em atraso"', () => {
    const html = cartaoPendentes(demanda('Aprovação', -6));
    expect(html).not.toContain('em atraso');
    expect(html).toContain('vencido, em aprovação');
    expect(html).not.toContain('cor-coral');
  });

  it('prazo vencido em execução continua "em atraso"', () => {
    const html = cartaoPendentes(demanda('Em execução', -2));
    expect(html).toContain('em atraso');
    expect(html).toContain('cor-coral');
  });

  it('prazo futuro e sem prazo mantêm as legendas anteriores', () => {
    expect(cartaoPendentes(demanda('Em execução', 5))).toContain('restantes');
    expect(cartaoPendentes(demanda('Em execução', 1))).toContain('prazo');
    expect(cartaoPendentes(demanda('Não iniciada', null))).toContain('a definir');
  });
});
