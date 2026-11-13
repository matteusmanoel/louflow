import { describe, expect, it } from 'vitest';
import { destinoInterno } from '@/lib/destino';
import { botaoDoAviso } from './mensagens';

/**
 * O formato do link nos avisos não muda: {APP_URL}/demandas/{id}.
 * Estes testes só fixam o contrato que o login e o controle de acesso da Demanda assumem.
 */
describe('link do aviso para a Demanda', () => {
  const base = 'https://louflow.exemplo.test';
  const id = 'LF0123ABCD';

  it.each(['editor_atribuido', 'ajuste_solicitado', 'concluida_aprovada'] as const)('%s abre /demandas/{id}', (tipo) => {
    const botao = botaoDoAviso({ tipo, demandaId: id }, `${base}/`);
    expect(botao).toEqual({ rotulo: 'Abrir demanda', url: `${base}/demandas/${id}` });
    // O caminho do link é um destino interno válido para o login (sobrevive ao redirecionamento).
    expect(destinoInterno(new URL(botao.url).pathname)).toBe(`/demandas/${id}`);
  });

  it('concluida_aprovada sem Demanda abre a agenda (inalterado)', () => {
    expect(botaoDoAviso({ tipo: 'concluida_aprovada' }, base)).toEqual({ rotulo: 'Abrir agenda', url: `${base}/agenda` });
  });
});
