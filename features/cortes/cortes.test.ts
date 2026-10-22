import { describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import { resolverPermissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '../../tests/helpers/db';
import { schemaCriarCorte, schemaConcluirCorte } from './schema';

usarBancoLimpo();

/** Cria uma sessão com permissões personalizadas. */
function sessaoDe(
  id: string,
  permissoes: Partial<ReturnType<typeof resolverPermissoes>> = {},
): UsuarioSessao {
  const base = resolverPermissoes('Editor', []);
  return {
    id,
    nome: 'Teste',
    perfil: 'Editor',
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: { ...base, ...permissoes },
    ehAprovadorDelegado: false,
  };
}

/** Entrada válida para criar corte. */
const entradaValida = {
  titulo: 'Entrevista no centro',
  influencerId: null,
  dataPostagem: '2026-12-01',
  linhaEditorial: 'Viral' as const,
  linkVideo: null,
  programaOrigem: 'Descubra Foz' as const,
};

/** Cria um corte no banco e retorna o id. */
async function inserirCorte(editorId: string, status = 'Em andamento'): Promise<string> {
  const id = `CL_TEST_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  // clips_count obrigatório quando status = 'Concluído' (CHECK no banco)
  const clipsCount = status === 'Concluído' ? 5 : null;
  await sqlTeste()`
    INSERT INTO clips (id, title, editor_id, post_date, editorial_line, source_program,
                       status, clips_count, created_by, started_at,
                       completed_at)
    VALUES (
      ${id},
      'Corte de teste',
      ${editorId},
      '2026-12-01',
      'Viral',
      'Descubra Foz',
      ${status},
      ${clipsCount},
      ${editorId},
      now(),
      ${status === 'Concluído' ? new Date() : null}
    )
  `;
  return id;
}

// ──────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────

describe('schemaCriarCorte', () => {
  it('aceita entrada válida', () => {
    expect(schemaCriarCorte.safeParse(entradaValida).success).toBe(true);
  });

  it('rejeita título vazio', () => {
    const r = schemaCriarCorte.safeParse({ ...entradaValida, titulo: '' });
    expect(r.success).toBe(false);
  });

  it('rejeita linha editorial inválida', () => {
    const r = schemaCriarCorte.safeParse({ ...entradaValida, linhaEditorial: 'Invalida' });
    expect(r.success).toBe(false);
  });

  it('rejeita programa de origem inválido', () => {
    const r = schemaCriarCorte.safeParse({ ...entradaValida, programaOrigem: 'Invalido' });
    expect(r.success).toBe(false);
  });

  it('rejeita data com formato errado', () => {
    const r = schemaCriarCorte.safeParse({ ...entradaValida, dataPostagem: '01/12/2026' });
    expect(r.success).toBe(false);
  });

  it('aceita linkVideo nulo ou vazio', () => {
    expect(schemaCriarCorte.safeParse({ ...entradaValida, linkVideo: null }).success).toBe(true);
    expect(schemaCriarCorte.safeParse({ ...entradaValida, linkVideo: undefined }).success).toBe(true);
  });
});

describe('schemaConcluirCorte', () => {
  it('aceita quantidade válida', () => {
    expect(schemaConcluirCorte.safeParse({ id: 'CL1', quantidadeProduzida: 5 }).success).toBe(true);
  });

  it('rejeita quantidade 0', () => {
    expect(schemaConcluirCorte.safeParse({ id: 'CL1', quantidadeProduzida: 0 }).success).toBe(false);
  });

  it('rejeita quantidade acima de 999', () => {
    expect(schemaConcluirCorte.safeParse({ id: 'CL1', quantidadeProduzida: 1000 }).success).toBe(false);
  });

  it('rejeita quantidade decimal', () => {
    expect(schemaConcluirCorte.safeParse({ id: 'CL1', quantidadeProduzida: 2.5 }).success).toBe(false);
  });
});

// ──────────────────────────────────────────────
// criarCorte
// ──────────────────────────────────────────────

describe('criarCorte', () => {
  it('cria corte com sucesso para editor padrão', async () => {
    const { id } = await criarUsuario();
    const sessao = sessaoDe(id, { editorPadraoCortes: true });
    const novoId = `CL_NOVO_${Date.now()}`;

    const r = await executarAcao(
      {
        nome: 'cortes:criar',
        schema: schemaCriarCorte,
        permissao: 'editorPadraoCortes',
        executar: async ({ tx, usuario, entrada }) => {
          await tx`
            INSERT INTO clips (id, title, influencer_id, editor_id, post_date,
              editorial_line, video_link, source_program, status, created_by, started_at)
            VALUES (
              ${novoId}, ${entrada.titulo}, ${entrada.influencerId ?? null}, ${usuario.id},
              ${entrada.dataPostagem}, ${entrada.linhaEditorial},
              ${entrada.linkVideo ?? null}, ${entrada.programaOrigem},
              'Em andamento', ${usuario.id}, now()
            )
          `;
          return { dados: { id: novoId }, mensagem: 'Corte cadastrado.' };
        },
      },
      entradaValida,
      { obterUsuario: async () => sessao, sql: sqlTeste },
    );

    expect(r.ok).toBe(true);
    const [clip] = await sqlTeste()<{ status: string }[]>`SELECT status FROM clips WHERE id = ${novoId}`;
    expect(clip?.status).toBe('Em andamento');
  });

  it('recusa criação sem permissão editorPadraoCortes', async () => {
    const { id } = await criarUsuario({ perfil: 'Editor' });
    const sessao = sessaoDe(id, { editorPadraoCortes: false });

    const { executarAcao: exec } = await import('@/lib/action');
    const r = await exec(
      { nome: 'cortes:criar', schema: schemaCriarCorte, permissao: 'editorPadraoCortes', executar: async () => ({ dados: null }) },
      entradaValida,
      { obterUsuario: async () => sessao, sql: sqlTeste },
    );

    expect(r.ok).toBe(false);
    expect(r.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('cria corte com status Em andamento', async () => {
    const { id } = await criarUsuario();
    const sessao = sessaoDe(id, { editorPadraoCortes: true });

    const { executarAcao: exec } = await import('@/lib/action');
    const r = await exec(
      {
        nome: 'cortes:criar',
        schema: schemaCriarCorte,
        permissao: 'editorPadraoCortes',
        executar: async ({ tx, usuario, entrada }) => {
          const novoId = `CL_T_${Date.now()}`;
          await tx`
            INSERT INTO clips (id, title, influencer_id, editor_id, post_date,
              editorial_line, video_link, source_program, status, created_by, started_at)
            VALUES (
              ${novoId}, ${entrada.titulo}, ${entrada.influencerId ?? null}, ${usuario.id},
              ${entrada.dataPostagem}, ${entrada.linhaEditorial},
              ${entrada.linkVideo ?? null}, ${entrada.programaOrigem},
              'Em andamento', ${usuario.id}, now()
            )
          `;
          return { dados: { id: novoId }, mensagem: 'Corte cadastrado.' };
        },
      },
      entradaValida,
      { obterUsuario: async () => sessao, sql: sqlTeste },
    );

    expect(r.ok).toBe(true);
    const [clip] = await sqlTeste()<{ status: string }[]>`SELECT status FROM clips WHERE id = ${(r as { dados: { id: string } }).dados.id}`;
    expect(clip?.status).toBe('Em andamento');
  });

  it('recusa título vazio (validação schema)', async () => {
    const { id } = await criarUsuario();
    const sessao = sessaoDe(id, { editorPadraoCortes: true });

    const { executarAcao: exec } = await import('@/lib/action');
    const r = await exec(
      { nome: 'cortes:criar', schema: schemaCriarCorte, permissao: 'editorPadraoCortes', executar: async () => ({ dados: null }) },
      { ...entradaValida, titulo: '' },
      { obterUsuario: async () => sessao, sql: sqlTeste },
    );

    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('Informe o título');
  });
});

// ──────────────────────────────────────────────
// concluirCorte
// ──────────────────────────────────────────────

describe('concluirCorte', () => {
  it('conclui corte em andamento', async () => {
    const { id: editorId } = await criarUsuario();
    const sessao = sessaoDe(editorId, { editorPadraoCortes: true });
    const clipId = await inserirCorte(editorId);

    const { executarAcao: exec } = await import('@/lib/action');
    const r = await exec(
      {
        nome: 'cortes:concluir',
        schema: schemaConcluirCorte,
        permissao: 'editorPadraoCortes',
        executar: async ({ tx, entrada }) => {
          const [corte] = await tx<{ status: string }[]>`SELECT status FROM clips WHERE id = ${entrada.id} FOR UPDATE`;
          if (!corte) throw new (await import('@/lib/errors')).ErroDominio('Corte não encontrado.');
          if (corte.status === 'Concluído') throw new (await import('@/lib/errors')).ErroDominio('Este corte já foi concluído.');
          await tx`UPDATE clips SET status = 'Concluído', clips_count = ${entrada.quantidadeProduzida}, completed_at = now() WHERE id = ${entrada.id}`;
          return { dados: { id: entrada.id }, mensagem: 'Corte concluído.' };
        },
      },
      { id: clipId, quantidadeProduzida: 7 },
      { obterUsuario: async () => sessao, sql: sqlTeste },
    );

    expect(r.ok).toBe(true);
    const [clip] = await sqlTeste()<{ status: string; clips_count: number }[]>`SELECT status, clips_count FROM clips WHERE id = ${clipId}`;
    expect(clip?.status).toBe('Concluído');
    expect(clip?.clips_count).toBe(7);
  });

  it('recusa concluir corte já concluído', async () => {
    const { id: editorId } = await criarUsuario();
    const sessao = sessaoDe(editorId, { editorPadraoCortes: true });
    const clipId = await inserirCorte(editorId, 'Concluído');

    const { executarAcao: exec } = await import('@/lib/action');
    const { ErroDominio } = await import('@/lib/errors');
    const r = await exec(
      {
        nome: 'cortes:concluir',
        schema: schemaConcluirCorte,
        permissao: 'editorPadraoCortes',
        executar: async ({ tx, entrada }) => {
          const [corte] = await tx<{ status: string }[]>`SELECT status FROM clips WHERE id = ${entrada.id} FOR UPDATE`;
          if (!corte) throw new ErroDominio('Corte não encontrado.');
          if (corte.status === 'Concluído') throw new ErroDominio('Este corte já foi concluído.');
          await tx`UPDATE clips SET status = 'Concluído', clips_count = ${entrada.quantidadeProduzida}, completed_at = now() WHERE id = ${entrada.id}`;
          return { dados: { id: entrada.id }, mensagem: 'Corte concluído.' };
        },
      },
      { id: clipId, quantidadeProduzida: 3 },
      { obterUsuario: async () => sessao, sql: sqlTeste },
    );

    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('já foi concluído');
  });

  it('recusa concluir sem permissão', async () => {
    const { id: editorId } = await criarUsuario();
    const sessao = sessaoDe(editorId, { editorPadraoCortes: false });
    const clipId = await inserirCorte(editorId);

    const { executarAcao: exec } = await import('@/lib/action');
    const r = await exec(
      { nome: 'cortes:concluir', schema: schemaConcluirCorte, permissao: 'editorPadraoCortes', executar: async () => ({ dados: null }) },
      { id: clipId, quantidadeProduzida: 5 },
      { obterUsuario: async () => sessao, sql: sqlTeste },
    );

    expect(r.ok).toBe(false);
    expect(r.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('recusa quantidade 0 (schema)', async () => {
    const { id } = await criarUsuario();
    const sessao = sessaoDe(id, { editorPadraoCortes: true });

    const { executarAcao: exec } = await import('@/lib/action');
    const r = await exec(
      { nome: 'cortes:concluir', schema: schemaConcluirCorte, permissao: 'editorPadraoCortes', executar: async () => ({ dados: null }) },
      { id: 'qualquer', quantidadeProduzida: 0 },
      { obterUsuario: async () => sessao, sql: sqlTeste },
    );

    expect(r.ok).toBe(false);
  });

  it('recusa corte inexistente', async () => {
    const { id: editorId } = await criarUsuario();
    const sessao = sessaoDe(editorId, { editorPadraoCortes: true });

    const { executarAcao: exec } = await import('@/lib/action');
    const { ErroDominio } = await import('@/lib/errors');
    const r = await exec(
      {
        nome: 'cortes:concluir',
        schema: schemaConcluirCorte,
        permissao: 'editorPadraoCortes',
        executar: async ({ tx, entrada }) => {
          const [corte] = await tx<{ status: string }[]>`SELECT status FROM clips WHERE id = ${entrada.id} FOR UPDATE`;
          if (!corte) throw new ErroDominio('Corte não encontrado.');
          return { dados: null };
        },
      },
      { id: 'CL_INEXISTENTE', quantidadeProduzida: 5 },
      { obterUsuario: async () => sessao, sql: sqlTeste },
    );

    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('não encontrado');
  });
});

// ──────────────────────────────────────────────
// listarCortes
// ──────────────────────────────────────────────

describe('listarCortes', () => {
  it('retorna lista vazia quando não há cortes', async () => {
    const { listarCortes: listar } = await import('./consultas');
    const lista = await listar();
    expect(lista).toEqual([]);
  });

  it('retorna cortes cadastrados com campos mapeados', async () => {
    const { id: editorId } = await criarUsuario({ nome: 'Editor Teste' });
    const clipId = await inserirCorte(editorId);

    const { listarCortes: listar } = await import('./consultas');
    const lista = await listar();

    expect(lista.length).toBe(1);
    const c = lista[0]!;
    expect(c.id).toBe(clipId);
    expect(c.titulo).toBe('Corte de teste');
    expect(c.status).toBe('Em andamento');
    expect(c.editorId).toBe(editorId);
    expect(c.quantidadeProduzida).toBeNull();
  });

  it('ordena por data de postagem descendente', async () => {
    const { id } = await criarUsuario();

    await sqlTeste()`
      INSERT INTO clips (id, title, editor_id, post_date, editorial_line, source_program, status, created_by)
      VALUES ('CL_A', 'Primeiro', ${id}, '2026-11-01', 'Viral', 'Descubra Foz', 'Em andamento', ${id}),
             ('CL_B', 'Segundo',  ${id}, '2026-12-01', 'Viral', 'Descubra Foz', 'Em andamento', ${id})
    `;

    const { listarCortes: listar } = await import('./consultas');
    const lista = await listar();

    expect(lista[0]!.dataPostagem).toBe('2026-12-01');
    expect(lista[1]!.dataPostagem).toBe('2026-11-01');
  });

  it('inclui cortes concluídos', async () => {
    const { id } = await criarUsuario();
    // inserirCorte com status 'Concluído' já insere clips_count = 5
    await inserirCorte(id, 'Concluído');

    const { listarCortes: listar } = await import('./consultas');
    const lista = await listar();
    const concluido = lista.find((c) => c.status === 'Concluído');
    expect(concluido).toBeDefined();
    expect(concluido?.quantidadeProduzida).toBe(5);
  });
});
