import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import { resolverPermissoes, type Perfil } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '../../tests/helpers/db';
import { defPrepararUpload } from './acoes-def';
import { schemaPrepararUpload } from './schema';
import { TAMANHO_MAXIMO_BYTES } from '@/lib/armazenamento-chave';

usarBancoLimpo();

const bucketOriginal = process.env.S3_BUCKET;

function sessao(id: string, perfil: Perfil): UsuarioSessao {
  return {
    id,
    nome: 'Teste',
    perfil,
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: resolverPermissoes(perfil, []),
    ehAprovadorDelegado: false,
  };
}

const entradaValida = {
  grupo: 'demandas' as const,
  donoId: 'LF0000000001',
  nomeArquivo: 'corte.mp4',
  tipo: 'video/mp4' as const,
  tamanho: 1024,
};

beforeEach(() => {
  delete process.env.S3_BUCKET;
});

afterAll(() => {
  if (bucketOriginal === undefined) delete process.env.S3_BUCKET;
  else process.env.S3_BUCKET = bucketOriginal;
});

describe('preparar envio de arquivo', () => {
  it('rejeita tipo, pasta e tamanho fora do contrato', () => {
    expect(schemaPrepararUpload.safeParse({ ...entradaValida, tipo: 'text/plain' }).success).toBe(false);
    expect(schemaPrepararUpload.safeParse({ ...entradaValida, grupo: 'tv' }).success).toBe(false);
    expect(schemaPrepararUpload.safeParse({ ...entradaValida, donoId: '../segredo' }).success).toBe(false);
    expect(schemaPrepararUpload.safeParse({ ...entradaValida, tamanho: 0 }).success).toBe(false);
    expect(schemaPrepararUpload.safeParse({ ...entradaValida, tamanho: TAMANHO_MAXIMO_BYTES + 1 }).success).toBe(false);
    expect(schemaPrepararUpload.safeParse({ ...entradaValida, tamanho: TAMANHO_MAXIMO_BYTES }).success).toBe(true);
  });

  it('nega o perfil Prêmios', async () => {
    const premios = await criarUsuario({ perfil: 'Premios' });
    const resultado = await executarAcao(defPrepararUpload, entradaValida, {
      obterUsuario: async () => sessao(premios.id, 'Premios'),
      sql: sqlTeste,
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('pede link externo quando o bucket não está configurado', async () => {
    const editor = await criarUsuario({ perfil: 'Editor' });
    const resultado = await executarAcao(defPrepararUpload, entradaValida, {
      obterUsuario: async () => sessao(editor.id, 'Editor'),
      sql: sqlTeste,
    });
    expect(resultado).toEqual({
      ok: false,
      mensagem: 'O armazenamento de arquivos não está configurado. Use um link externo.',
    });
  });
});
