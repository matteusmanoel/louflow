import { describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO, type DefinicaoAcao } from '@/lib/action';
import type { z } from 'zod';
import { resolverPermissoes } from '@/lib/permissions';
import type { Perfil } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '../../tests/helpers/db';
import {
  defAlterarPublicacaoArtigoWiki,
  defCriarArtigoWiki,
  defEditarArtigoWiki,
} from './acoes-def';
import { listarArtigosWiki, obterArtigoWiki } from './consultas';
import { schemaSalvarArtigoWiki } from './schema';

usarBancoLimpo();

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
  category: 'Demandas',
  title: 'Fluxo de teste',
  summary: 'Resumo sintético do fluxo.',
  content: 'Conteúdo operacional de teste, sem demanda real.',
  position: 10,
  is_published: true,
};

function executarComo(def: DefinicaoAcao<z.ZodType, { id: string }>, entrada: unknown, id: string, perfil: Perfil) {
  return executarAcao(def, entrada, {
    obterUsuario: async () => sessao(id, perfil),
    sql: sqlTeste,
  });
}

describe('schema do artigo', () => {
  it('rejeita conteúdo acima de 15000 caracteres e aceita o limite', () => {
    const longo = schemaSalvarArtigoWiki.safeParse({ ...entradaValida, content: 'a'.repeat(15001) });
    const noLimite = schemaSalvarArtigoWiki.safeParse({ ...entradaValida, content: 'a'.repeat(15000) });
    expect(longo.success).toBe(false);
    expect(noLimite.success).toBe(true);
  });

  it('rejeita ordem fora de 1 a 999 e aceita os extremos', () => {
    expect(schemaSalvarArtigoWiki.safeParse({ ...entradaValida, position: 0 }).success).toBe(false);
    expect(schemaSalvarArtigoWiki.safeParse({ ...entradaValida, position: 1000 }).success).toBe(false);
    expect(schemaSalvarArtigoWiki.safeParse({ ...entradaValida, position: 1 }).success).toBe(true);
    expect(schemaSalvarArtigoWiki.safeParse({ ...entradaValida, position: 999 }).success).toBe(true);
  });

  it('rejeita categoria e título vazios', () => {
    expect(schemaSalvarArtigoWiki.safeParse({ ...entradaValida, category: '   ' }).success).toBe(false);
    expect(schemaSalvarArtigoWiki.safeParse({ ...entradaValida, title: '' }).success).toBe(false);
  });

  it('a ação não grava conteúdo ou ordem rejeitados pelo schema', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const longo = await executarComo(
      defCriarArtigoWiki,
      { ...entradaValida, content: 'a'.repeat(15001) },
      admin.id,
      'Administrador',
    );
    const ordem = await executarComo(
      defCriarArtigoWiki,
      { ...entradaValida, position: 0 },
      admin.id,
      'Administrador',
    );
    expect(longo.ok).toBe(false);
    expect(ordem.ok).toBe(false);
    const [linha] = await sqlTeste()<{ n: number }[]>`SELECT count(*)::int AS n FROM wiki_articles`;
    expect(linha?.n).toBe(0);
  });
});

describe('criar e editar artigo', () => {
  it('administrador cria e edita título, conteúdo e ordem', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const criado = await executarComo(defCriarArtigoWiki, entradaValida, admin.id, 'Administrador');
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;

    const editado = await executarComo(
      defEditarArtigoWiki,
      {
        ...entradaValida,
        id: criado.dados.id,
        title: 'Fluxo revisado',
        content: 'Conteúdo revisado para a próxima etapa.',
        position: 4,
        is_published: false,
      },
      admin.id,
      'Administrador',
    );
    expect(editado.ok).toBe(true);

    const [linha] = await sqlTeste()<
      { title: string; content: string; position: number; is_published: boolean; updated_by: string }[]
    >`
      SELECT title, content, position, is_published, updated_by
      FROM wiki_articles
      WHERE id = ${criado.dados.id}
    `;
    expect(linha).toMatchObject({
      title: 'Fluxo revisado',
      content: 'Conteúdo revisado para a próxima etapa.',
      position: 4,
      is_published: false,
      updated_by: admin.id,
    });
  });
});

describe('permissão', () => {
  it('editor não cria, não edita e não altera a publicação', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const editor = await criarUsuario({ perfil: 'Editor' });
    const criado = await executarComo(defCriarArtigoWiki, entradaValida, admin.id, 'Administrador');
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;

    const criar = await executarComo(defCriarArtigoWiki, { ...entradaValida, title: 'Outro' }, editor.id, 'Editor');
    const editar = await executarComo(
      defEditarArtigoWiki,
      { ...entradaValida, id: criado.dados.id, title: 'Alterado pelo editor' },
      editor.id,
      'Editor',
    );
    const publicar = await executarComo(
      defAlterarPublicacaoArtigoWiki,
      { id: criado.dados.id, is_published: false },
      editor.id,
      'Editor',
    );

    expect(criar.ok).toBe(false);
    expect(criar.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);
    expect(editar.ok).toBe(false);
    expect(editar.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);
    expect(publicar.ok).toBe(false);
    expect(publicar.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);
  });
});

describe('listagem', () => {
  it('editor vê só o publicado e administrador vê publicado e rascunho', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const publicado = await executarComo(
      defCriarArtigoWiki,
      { ...entradaValida, title: 'Visível', position: 1, is_published: true },
      admin.id,
      'Administrador',
    );
    const rascunho = await executarComo(
      defCriarArtigoWiki,
      { ...entradaValida, title: 'Oculto', position: 2, is_published: false },
      admin.id,
      'Administrador',
    );
    expect(publicado.ok && rascunho.ok).toBe(true);
    if (!publicado.ok || !rascunho.ok) return;

    const doEditor = await listarArtigosWiki('Editor', sqlTeste());
    const doAdmin = await listarArtigosWiki('Administrador', sqlTeste());

    expect(doEditor.map((artigo) => artigo.title)).toEqual(['Visível']);
    expect(doAdmin.map((artigo) => artigo.title).sort()).toEqual(['Oculto', 'Visível']);
    expect(await obterArtigoWiki(rascunho.dados.id, 'Editor', sqlTeste())).toBeNull();
    expect((await obterArtigoWiki(rascunho.dados.id, 'Administrador', sqlTeste()))?.title).toBe('Oculto');
  });

  it('despublicar tira o artigo da lista do editor', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const criado = await executarComo(defCriarArtigoWiki, entradaValida, admin.id, 'Administrador');
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;

    const despublicado = await executarComo(
      defAlterarPublicacaoArtigoWiki,
      { id: criado.dados.id, is_published: false },
      admin.id,
      'Administrador',
    );
    expect(despublicado.ok).toBe(true);
    expect((await listarArtigosWiki('Editor', sqlTeste())).map((artigo) => artigo.id)).not.toContain(criado.dados.id);
    expect((await listarArtigosWiki('Administrador', sqlTeste())).map((artigo) => artigo.id)).toContain(criado.dados.id);
  });
});
