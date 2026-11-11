import { describe, expect, it } from 'vitest';
import { lerCotaBytes } from '@/lib/env';

describe('cota do Drive', () => {
  it('aceita inteiro e sufixo na base 1024', () => {
    expect(lerCotaBytes('100')).toBe(100);
    expect(lerCotaBytes('1TB')).toBe(1024 ** 4);
    expect(lerCotaBytes('1tb')).toBe(1024 ** 4);
    expect(lerCotaBytes('2 GB')).toBe(2 * 1024 ** 3);
  });

  it('usa 20 GB quando o valor falta ou é inválido', () => {
    expect(lerCotaBytes(undefined)).toBe(20 * 1024 ** 3);
    expect(lerCotaBytes('')).toBe(20 * 1024 ** 3);
    expect(lerCotaBytes('nope')).toBe(20 * 1024 ** 3);
  });
});
