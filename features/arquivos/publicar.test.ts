import { describe, expect, it, vi } from 'vitest';
import { publicarArquivos } from './publicar';
import { selecionarArquivos, type ArquivoPendente } from './selecao';
import { LIMITE_ARQUIVOS } from '@/lib/armazenamento-chave';
import type { ItemArquivo } from './schema';

const item: ItemArquivo = {
  url: 'https://louflow-app-private-796576080439.s3.us-east-1.amazonaws.com/demandas/LF0000000001/11111111-1111-4111-8111-111111111111-a.mp4',
  nome: 'a.mp4',
  tipo: 'video/mp4',
  tamanho: 4,
};

function pendente(nome: string): ArquivoPendente {
  return { id: nome, nome, tipo: 'video/mp4', tamanho: 4, arquivo: new Blob(['dado']) };
}

describe('seleção local', () => {
  it('aceita o arquivo sem produzir endereço de armazenamento', () => {
    const resultado = selecionarArquivos(0, [{ name: 'corte.mp4', type: 'video/mp4', size: 10 }]);
    expect(resultado).toEqual({ indices: [0], tipos: ['video/mp4'], erros: [] });
  });

  it('aceita HEIC mesmo quando o navegador não informa o tipo', () => {
    expect(selecionarArquivos(0, [{ name: 'foto.HEIC', type: '', size: 10 }]).tipos).toEqual(['image/heic']);
    expect(selecionarArquivos(0, [{ name: 'foto.heif', type: 'application/octet-stream', size: 10 }]).tipos).toEqual(['image/heic']);
    expect(selecionarArquivos(0, [{ name: 'foto.heic', type: 'image/heic', size: 10 }]).tipos).toEqual(['image/heic']);
  });

  it('recusa tipo inválido e estouro do limite', () => {
    expect(selecionarArquivos(0, [{ name: 'nota.txt', type: 'text/plain', size: 10 }]).indices).toEqual([]);
    expect(selecionarArquivos(LIMITE_ARQUIVOS, [{ name: 'extra.mp4', type: 'video/mp4', size: 10 }]).indices).toEqual([]);
  });
});

describe('publicação adiada', () => {
  it('grava sem falar com o armazenamento quando não há arquivo', async () => {
    const enviar = vi.fn();
    const descartar = vi.fn();
    const persistir = vi.fn(async () => ({ ok: true as const, mensagem: 'criada' }));
    const resultado = await publicarArquivos({ pendentes: [], enviar, descartar, persistir });
    expect(resultado.ok).toBe(true);
    expect(enviar).not.toHaveBeenCalled();
    expect(descartar).not.toHaveBeenCalled();
    expect(persistir).toHaveBeenCalledWith([]);
  });

  it('descarta o que já subiu quando a gravação falha', async () => {
    const descartar = vi.fn(async () => undefined);
    const resultado = await publicarArquivos({
      pendentes: [pendente('a.mp4')],
      enviar: async () => ({ ok: true, item }),
      descartar,
      persistir: async () => ({ ok: false as const, mensagem: 'Não foi possível criar a Demanda.' }),
    });
    expect(resultado).toEqual({ ok: false, mensagem: 'Não foi possível criar a Demanda.' });
    expect(descartar).toHaveBeenCalledWith([item.url]);
  });

  it('descarta o lote parcial quando um envio falha', async () => {
    const descartar = vi.fn(async () => undefined);
    const persistir = vi.fn();
    const resultado = await publicarArquivos({
      pendentes: [pendente('a.mp4'), pendente('b.mp4')],
      enviar: async (arquivo) =>
        arquivo.nome === 'a.mp4'
          ? { ok: true, item }
          : { ok: false, mensagem: 'Não foi possível enviar b.mp4.', urlParcial: 'https://bucket.example/b.mp4' },
      descartar,
      persistir,
    });
    expect(resultado.ok).toBe(false);
    expect(persistir).not.toHaveBeenCalled();
    expect(descartar).toHaveBeenCalledWith([item.url, 'https://bucket.example/b.mp4']);
  });

  it('mantém os arquivos quando a gravação conclui', async () => {
    const descartar = vi.fn();
    const resultado = await publicarArquivos({
      pendentes: [pendente('a.mp4')],
      enviar: async () => ({ ok: true, item }),
      descartar,
      persistir: async (arquivos) => ({ ok: true as const, mensagem: 'criada', arquivos }),
    });
    expect(resultado.ok).toBe(true);
    expect(descartar).not.toHaveBeenCalled();
  });
});
