import { describe, expect, it } from 'vitest';
import { chaveDaUrl, chaveDoDono, montarChave, nomeSeguro, urlDoObjeto } from './armazenamento-chave';

const BUCKET = 'louflow-app-private-796576080439';
const REGIAO = 'us-east-1';
const DEMANDA = 'LF00000000AB';

describe('chave de arquivo', () => {
  it('monta a chave na pasta da Demanda', () => {
    const chave = montarChave('demandas', DEMANDA, 'Meu Vídeo Final.mp4', '11111111-1111-4111-8111-111111111111');
    expect(chave).toBe(`demandas/${DEMANDA}/11111111-1111-4111-8111-111111111111-meu-video-final.mp4`);
    expect(chaveDoDono(chave, 'demandas', DEMANDA)).toBe(true);
    expect(chaveDoDono(chave, 'demandas', 'LF00000000CD')).toBe(false);
    const livre = montarChave('drive', 'raiz', 'notas.pdf', '11111111-1111-4111-8111-111111111111');
    expect(livre).toBe('drive/raiz/11111111-1111-4111-8111-111111111111-notas.pdf');
    expect(chaveDoDono(livre, 'drive', 'raiz')).toBe(true);
  });

  it('recusa identificador com caminho', () => {
    expect(() => montarChave('demandas', '../segredo', 'a.mp4')).toThrow('Identificador inválido.');
  });

  it('descarta caminho e nomes vazios', () => {
    expect(nomeSeguro('../../etc/passwd')).toBe('passwd');
    expect(nomeSeguro('..')).toBe('arquivo');
    expect(nomeSeguro('   ')).toBe('arquivo');
  });

  it('reconhece a URL do bucket e preserva link externo', () => {
    const chave = montarChave('cortes', 'CL00000000AB', 'corte.mp4', '11111111-1111-4111-8111-111111111111');
    const url = urlDoObjeto(BUCKET, REGIAO, chave);
    expect(chaveDaUrl(url, BUCKET, REGIAO)).toBe(chave);
    expect(chaveDaUrl('https://drive.google.com/file/d/1', BUCKET, REGIAO)).toBeNull();
    expect(chaveDaUrl(`https://evil.example/${BUCKET}/demandas/${DEMANDA}/a.mp4`, BUCKET, REGIAO)).toBeNull();
    expect(chaveDaUrl(`https://${BUCKET}.s3.${REGIAO}.amazonaws.com/demandas/../segredo`, BUCKET, REGIAO)).toBeNull();
    const legada = 'entregas/2026/11/11111111-1111-4111-8111-111111111111-corte.mp4';
    expect(chaveDaUrl(urlDoObjeto(BUCKET, REGIAO, legada), BUCKET, REGIAO)).toBe(legada);
  });
});
