import { describe, expect, it } from 'vitest';
import { caminhoLogin, caminhoTrocaPin, destinoFinal, destinoInterno } from './destino';

describe('destinoInterno (anti open redirect)', () => {
  it('aceita caminhos internos, com query e hash', () => {
    for (const ok of ['/', '/demandas', '/demandas/LF123?aba=comentarios', '/agenda?mes=2026-11', '/demandas/LF1#topo']) {
      expect(destinoInterno(ok)).toBe(ok);
    }
  });

  it('rejeita URL externa, protocolo relativo, barra invertida, controle e javascript:', () => {
    const ruins = [
      '//evil.com',
      '//evil.com/x',
      '/\\evil.com',
      '/\\/evil.com',
      '/\t/evil.com',
      '/\n/evil.com',
      '/\r/evil.com',
      'https://evil.com',
      'http://evil.com/demandas',
      'javascript:alert(1)',
      'demandas',
      '',
      '\\\\evil.com',
      ' /demandas',
    ];
    for (const ruim of ruins) expect(destinoInterno(ruim), JSON.stringify(ruim)).toBe('/');
  });

  it('rejeita API, laço de login, valor muito longo e tipos que não são texto', () => {
    expect(destinoInterno('/api/cron/x')).toBe('/');
    expect(destinoInterno('/api')).toBe('/');
    expect(destinoInterno('/login')).toBe('/');
    expect(destinoInterno('/login?para=/demandas')).toBe('/');
    expect(destinoInterno('/' + 'a'.repeat(2001))).toBe('/');
    expect(destinoInterno(undefined)).toBe('/');
    expect(destinoInterno(null)).toBe('/');
    expect(destinoInterno(['/demandas'])).toBe('/');
    expect(destinoInterno('//evil.com', '/demandas')).toBe('/demandas');
  });

  it('não confunde rotas parecidas com as proibidas', () => {
    expect(destinoInterno('/apiary')).toBe('/apiary');
    expect(destinoInterno('/loginx')).toBe('/loginx');
  });
});

describe('destinoFinal e caminhoTrocaPin: o destino sobrevive à troca de PIN', () => {
  it('desembrulha /trocar-pin?para=X e nunca devolve a própria troca de PIN', () => {
    expect(destinoFinal('/trocar-pin?para=%2Fdemandas%2FLF1')).toBe('/demandas/LF1');
    expect(destinoFinal('/trocar-pin')).toBe('/');
    expect(destinoFinal('/trocar-pin?para=%2Ftrocar-pin%3Fpara%3D%2Fdemandas')).toBe('/');
    expect(destinoFinal('/trocar-pin?para=%2F%2Fevil.com')).toBe('/');
    expect(destinoFinal('//evil.com')).toBe('/');
  });

  it('caminhoTrocaPin leva o destino codificado; a raiz e valores ruins ficam sem parâmetro', () => {
    expect(caminhoTrocaPin('/demandas/LF1?aba=historico')).toBe('/trocar-pin?para=%2Fdemandas%2FLF1%3Faba%3Dhistorico');
    expect(caminhoTrocaPin('/')).toBe('/trocar-pin');
    expect(caminhoTrocaPin('//evil.com')).toBe('/trocar-pin');
    expect(caminhoTrocaPin('/trocar-pin?para=%2Fdemandas%2FLF1')).toBe('/trocar-pin?para=%2Fdemandas%2FLF1');
  });

  it('caminhoLogin leva o destino e descarta o que não é interno', () => {
    expect(caminhoLogin('/demandas/LF1')).toBe('/login?para=%2Fdemandas%2FLF1');
    expect(caminhoLogin('/')).toBe('/login');
    expect(caminhoLogin('https://evil.com')).toBe('/login');
  });
});
