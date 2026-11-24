import { describe, expect, it } from 'vitest';
import { demandaAtrasada, situacaoPrazo } from './atraso';
import { TRANSICOES, type StatusDemanda } from './transicoes';

const STATUS = Object.keys(TRANSICOES) as StatusDemanda[];

describe('regra de atraso (PRD §4.3)', () => {
  it('prazo vencido só é atraso fora de Status Final e fora de Aprovação', () => {
    const atrasam = STATUS.filter((status) => demandaAtrasada(status, -3));
    expect(atrasam.sort()).toEqual(['Ajustes solicitados', 'Em execução', 'Não iniciada', 'Pausada'].sort());
    expect(demandaAtrasada('Aprovação', -3)).toBe(false);
  });

  it('sem prazo, hoje e futuro nunca são atraso', () => {
    for (const status of STATUS) {
      expect(demandaAtrasada(status, null)).toBe(false);
      expect(demandaAtrasada(status, 0)).toBe(false);
      expect(demandaAtrasada(status, 5)).toBe(false);
    }
  });

  it('prazo vencido em Aprovação aparece como vencido, não como atraso', () => {
    expect(situacaoPrazo('Aprovação', -6)).toBe('vencido-em-aprovacao');
    expect(situacaoPrazo('Em execução', -6)).toBe('atrasada');
    expect(situacaoPrazo('Em execução', null)).toBe('sem-prazo');
    expect(situacaoPrazo('Em execução', 1)).toBe('proximo');
    expect(situacaoPrazo('Em execução', 7)).toBe('no-prazo');
  });
});
