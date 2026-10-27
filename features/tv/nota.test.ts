import { describe, expect, it } from 'vitest';
import {
  calcularProdutividade,
  calcularRanking,
  dentroDoPrazo,
  diasAtePrazo,
  selecionarCarga,
  type CaptacaoRanking,
  type DemandaProdutividade,
  type DemandaRanking,
} from './nota';

const HORA = 3_600_000;

function demanda(parcial: Partial<DemandaRanking> & Pick<DemandaRanking, 'editor'>): DemandaRanking {
  return {
    formato: 'Reels',
    ajustes: 0,
    tempoAtivoMs: 0,
    staff: false,
    disputa: true,
    ...parcial,
  };
}

describe('calcularRanking', () => {
  it('dá 40 pontos de volume a quem mais entrega e deixa criativo fora da nota', () => {
    const cheio = calcularRanking([
      demanda({ editor: 'Ada' }),
      demanda({ editor: 'Ada' }),
      demanda({ editor: 'Bia' }),
      demanda({ editor: 'Cia', formato: 'Criativo' }),
      demanda({ editor: 'Cia', formato: 'Criativos' }),
    ], []);

    const ada = cheio.find((item) => item.editor === 'Ada');
    const bia = cheio.find((item) => item.editor === 'Bia');
    const cia = cheio.find((item) => item.editor === 'Cia');

    expect(ada).toMatchObject({ nota: 85.7, quantidade: 2, demandasNota: 2, staff: false });
    expect(bia).toMatchObject({ nota: 57.1, quantidade: 1, demandasNota: 1 });
    expect(cia).toMatchObject({ nota: 0, quantidade: 2, demandasNota: 0 });
    expect(cheio.findIndex((item) => item.editor === 'Ada')).toBeLessThan(
      cheio.findIndex((item) => item.editor === 'Bia'),
    );
  });

  it('mede agilidade pelo menor tempo médio de quem disputa', () => {
    const ranking = calcularRanking([
      demanda({ editor: 'Ada', tempoAtivoMs: 2 * HORA }),
      demanda({ editor: 'Bia', tempoAtivoMs: 4 * HORA }),
    ], []);

    expect(ranking.find((item) => item.editor === 'Ada')).toMatchObject({ nota: 100, tempoMedioHoras: 2 });
    expect(ranking.find((item) => item.editor === 'Bia')).toMatchObject({ nota: 92.9, tempoMedioHoras: 4 });
  });

  it('aprovação direta cai quando houve ajuste', () => {
    const ranking = calcularRanking([
      demanda({ editor: 'Ada', ajustes: 0 }),
      demanda({ editor: 'Ada', ajustes: 1 }),
    ], []);

    expect(ranking[0]).toMatchObject({ percentualAprovacao: 50, nota: 71.4, demandasNota: 2 });
  });

  it('staff recebe nota e não entra na disputa', () => {
    const ranking = calcularRanking([
      demanda({ editor: 'Ada' }),
      demanda({ editor: 'Ada' }),
      demanda({ editor: 'Staff', staff: true, disputa: false }),
    ], []);

    expect(ranking.map((item) => item.editor)).toEqual(['Ada', 'Staff']);
    expect(ranking[1]).toMatchObject({ staff: true, nota: 57.1, quantidade: 1 });
  });

  it('captação concluída entra no volume da nota', () => {
    const captacao: CaptacaoRanking = { editor: 'Ada', staff: false, disputa: true };
    const ranking = calcularRanking([], [captacao, captacao]);
    expect(ranking[0]).toMatchObject({ quantidade: 2, demandasNota: 0, nota: 85.7, percentualAprovacao: 100 });
  });

  it('ignora quem não disputa e não é staff', () => {
    expect(calcularRanking([demanda({ editor: 'Fora', disputa: false, staff: false })], [])).toEqual([]);
  });
});

describe('calcularProdutividade', () => {
  it('devolve null quando o mês não tem conclusão', () => {
    expect(calcularProdutividade([], 0)).toBeNull();
  });

  it('conta prazo com o fim do dia em BRT e a pausa encerrada', () => {
    const noDia = new Date('2026-10-23T18:00:00.000Z');
    const depois = new Date('2026-10-24T03:30:00.000Z');
    const base: DemandaProdutividade = {
      formato: 'Reels',
      prazo: '2026-10-23',
      pausaMs: 0,
      ultimaEntregaEm: noDia,
      tempoAtivoMs: 2 * HORA,
    };
    const comPausa: DemandaProdutividade = { ...base, ultimaEntregaEm: depois, pausaMs: HORA };

    expect(dentroDoPrazo(noDia, '2026-10-23', 0)).toBe(true);
    expect(dentroDoPrazo(depois, '2026-10-23', 0)).toBe(false);
    expect(dentroDoPrazo(depois, '2026-10-23', HORA)).toBe(true);

    const produtividade = calcularProdutividade([base, { ...base, ultimaEntregaEm: depois }, comPausa], 1);
    expect(produtividade).toMatchObject({
      totalConcluidas: 4,
      tempoMedioHoras: 2,
      percentualNoPrazo: 67,
    });
    expect(produtividade?.porFormato).toEqual([
      { formato: 'Reels', quantidade: 3 },
      { formato: 'Captação', quantidade: 1 },
    ]);
  });
});

describe('dias e carga', () => {
  it('conta dias de calendário em America/Sao_Paulo', () => {
    const agora = new Date('2026-10-23T15:00:00-03:00');
    expect(diasAtePrazo('2026-10-25', agora)).toBe(2);
    expect(diasAtePrazo('2026-10-23', agora)).toBe(0);
    expect(diasAtePrazo('2026-10-22', agora)).toBe(-1);
    expect(diasAtePrazo(null, agora)).toBeNull();
  });

  it('fica com os oito editores de maior carga', () => {
    const itens = Array.from({ length: 9 }, (_, indice) => ({
      editor: `Editor ${indice}`,
      abertas: indice,
      atrasadas: 0,
      cortesEmAndamento: indice === 0 ? 1 : 0,
    }));
    const carga = selecionarCarga(itens);
    expect(carga).toHaveLength(8);
    expect(carga[0]).toMatchObject({ editor: 'Editor 8', abertas: 8, disponibilidade: 'Carga alta' });
    expect(carga.map((item) => item.editor)).not.toContain('Editor 0');
    expect(selecionarCarga([{ editor: 'Ada', abertas: 2, atrasadas: 1, cortesEmAndamento: 0 }])[0])
      .toMatchObject({ disponibilidade: 'Boa disponibilidade' });
  });
});
