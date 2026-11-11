import { describe, expect, it } from 'vitest';
import { formatarTamanho } from './formato';

describe('formatarTamanho', () => {
  it('sobe de unidade quando o valor arredonda para 1024', () => {
    expect(formatarTamanho(500)).toBe('500 B');
    expect(formatarTamanho(1536)).toBe('1,5 KB');
    expect(formatarTamanho(20 * 1024 ** 3)).toBe('20 GB');
    expect(formatarTamanho(1024 ** 4)).toBe('1 TB');
    expect(formatarTamanho(1024 ** 4 - 3.2 * 1024 * 1024)).toBe('1 TB');
  });
});
