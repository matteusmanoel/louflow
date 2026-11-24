import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import { resolverPermissoes, type Perfil } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '../../tests/helpers/db';
import { defDescartarUploads, defPrepararUpload } from './acoes-def';
import { schemaPrepararUpload } from './schema';
import { chavesOrfas } from './orfaos';
import { TAMANHO_MAXIMO_BYTES, montarChave, urlDoObjeto } from '@/lib/armazenamento-chave';

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

describe('descarte de arquivo órfão', () => {
  it('nega o perfil Prêmios', async () => {
    const premios = await criarUsuario({ perfil: 'Premios' });
    const resultado = await executarAcao(defDescartarUploads, { urls: [] }, {
      obterUsuario: async () => sessao(premios.id, 'Premios'),
      sql: sqlTeste,
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('aponta só o objeto que ainda não foi gravado', async () => {
    const { id } = await criarUsuario();
    const bucket = 'louflow-app-private-796576080439';
    const regiao = 'us-east-1';
    const demandaId = 'LF0000000001';
    const urlGravada = urlDoObjeto(bucket, regiao, montarChave('demandas', demandaId, 'gravado.mp4', '11111111-1111-4111-8111-111111111111'));
    const chaveOrfa = montarChave('demandas', demandaId, 'orfao.mp4', '22222222-2222-4222-8222-222222222222');
    const urlOrfa = urlDoObjeto(bucket, regiao, chaveOrfa);
    const urlCorte = urlDoObjeto(bucket, regiao, montarChave('cortes', 'CL0000000001', 'corte.mp4', '33333333-3333-4333-8333-333333333333'));
    const chaveDrive = montarChave('drive', 'raiz', 'notas.pdf', '44444444-4444-4444-8444-444444444444');
    const urlDrive = urlDoObjeto(bucket, regiao, chaveDrive);
    const sql = sqlTeste();
    await sql`
      INSERT INTO demands (id, title, format, status, priority, created_by)
      VALUES (${demandaId}, 'Demanda', 'Vídeo', 'Em execução', 'Normal', ${id})`;
    await sql`
      INSERT INTO demand_files (id, demand_id, url, file_name, content_type, byte_size, created_by)
      VALUES ('AR0000000001', ${demandaId}, ${urlGravada}, 'gravado.mp4', 'video/mp4', 10, ${id})`;
    await sql`
      INSERT INTO clips (id, title, editor_id, post_date, editorial_line, source_program, video_link, video_links, created_by)
      VALUES (
        'CL0000000001', 'Corte', ${id}, '2026-11-01', 'Viral', 'Descubra Foz', ${urlCorte},
        ${sql.array([urlCorte], 1009)}, ${id}
      )`;
    await sql`
      INSERT INTO drive_nodes (id, parent_id, kind, name, url, content_type, byte_size, created_by)
      VALUES ('DR0000000001', NULL, 'arquivo', 'notas.pdf', ${urlDrive}, 'application/pdf', 10, ${id})`;

    const chaves = await sql.begin((tx) =>
      chavesOrfas(tx, [urlGravada, urlOrfa, urlCorte, urlDrive, 'https://drive.google.com/file/d/1'], bucket, regiao),
    );
    expect(chaves).toEqual([chaveOrfa]);
  });
});
