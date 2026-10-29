import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOGO } from './catalogo';

describe('catálogo de equipamentos', () => {
  it('lista as doze fotos do catálogo legado, sem repetir arquivo', () => {
    expect(CATALOGO).toHaveLength(12);
    const arquivos = CATALOGO.map((item) => item.arquivo);
    expect(new Set(arquivos).size).toBe(12);
    for (const item of CATALOGO) {
      expect(item.rotulo.trim().length).toBeGreaterThan(0);
      expect(existsSync(`public/equipamentos/${item.arquivo}`)).toBe(true);
    }
  });
});
