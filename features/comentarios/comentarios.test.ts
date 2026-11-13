import { describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_SESSAO } from '@/lib/action';
import { resolverPermissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { defAdicionarComentario, defExcluirComentario } from './_acoes-def';
import { listarComentarios } from './consultas';
import { listarHistorico } from '@/features/historico/consultas';

usarBancoLimpo();

// ---- helpers ----

const sessaoDe = (
  id: string,
  permissoes: Partial<ReturnType<typeof resolverPermissoes>> = {},
): UsuarioSessao => ({
  id,
  nome: 'Teste',
  perfil: 'Editor',
  editorLabel: null,
  deveTrocarPin: false,
  permissoes: { ...resolverPermissoes('Editor', []), ...permissoes },
  ehAprovadorDelegado: false,
});

const deps = (usuario: UsuarioSessao) => ({
  obterUsuario: async () => usuario,
  sql: sqlTeste,
});

/**
 * Cria uma demanda mínima para usar nos testes. Quem cria é o Editor responsável
 * (só quem pode ver a Demanda comenta nela); `influencerId` é opcional.
 */
async function criarDemanda(criadoPorId: string, influencerId: string | null = null): Promise<string> {
  const id = 'LFTEST00' + Math.random().toString(36).slice(2, 6).toUpperCase();
  await sqlTeste()`
    INSERT INTO demands (id, title, format, status, priority, created_by, editor_id, influencer_id)
    VALUES (${id}, 'Demanda Teste', 'Reels', 'Não iniciada', 'Normal', ${criadoPorId}, ${criadoPorId}, ${influencerId})
  `;
  return id;
}

// ============================================================
// 1. Adicionar comentário
// ============================================================
describe('adicionarComentario', () => {
  it('o Editor responsável pode adicionar comentário', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const sessao = sessaoDe(u.id);

    const r = await executarAcao(
      defAdicionarComentario,
      { demandaId, conteudo: 'Ótima demanda!' },
      deps(sessao),
    );

    expect(r).toMatchObject({ ok: true, mensagem: 'Comentário adicionado.' });

    const comentarios = await listarComentarios(sqlTeste(), demandaId);
    expect(comentarios).toHaveLength(1);
    expect(comentarios[0]).toMatchObject({
      conteudo: 'Ótima demanda!',
      autorId: u.id,
    });
  });

  it('registra entrada no histórico ao comentar', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);

    await executarAcao(
      defAdicionarComentario,
      { demandaId, conteudo: 'Olá!' },
      deps(sessaoDe(u.id)),
    );

    const hist = await listarHistorico(sqlTeste(), demandaId);
    expect(hist.some((h) => h.acao === 'comentou')).toBe(true);
  });

  it('conteúdo vazio é rejeitado', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);

    const r = await executarAcao(
      defAdicionarComentario,
      { demandaId, conteudo: '' },
      deps(sessaoDe(u.id)),
    );

    expect(r.ok).toBe(false);
  });

  it('sem sessão retorna mensagem de sessão expirada', async () => {
    const r = await executarAcao(defAdicionarComentario, { demandaId: 'X', conteudo: 'Oi' }, {
      obterUsuario: async () => null,
      sql: sqlTeste,
    });

    expect(r).toMatchObject({ ok: false, mensagem: MENSAGEM_SEM_SESSAO });
  });

  it('múltiplos comentários de usuários distintos', async () => {
    const u1 = await criarUsuario();
    const u2 = await criarUsuario();
    const demandaId = await criarDemanda(u1.id, u2.id);

    await executarAcao(defAdicionarComentario, { demandaId, conteudo: 'Comentário 1' }, deps(sessaoDe(u1.id)));
    await executarAcao(defAdicionarComentario, { demandaId, conteudo: 'Comentário 2' }, deps(sessaoDe(u2.id)));

    const comentarios = await listarComentarios(sqlTeste(), demandaId);
    expect(comentarios).toHaveLength(2);
  });
});

// ============================================================
// 1b. Acesso à Demanda ao comentar (IDOR)
// ============================================================
describe('adicionarComentario: acesso à Demanda', () => {
  async function cenario() {
    const editor = await criarUsuario({ perfil: 'Editor' });
    const outroEditor = await criarUsuario({ perfil: 'Editor' });
    const influencer = await criarUsuario({ perfil: 'Influencer' });
    const outroInfluencer = await criarUsuario({ perfil: 'Influencer' });
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const delegado = await criarUsuario({ perfil: 'Influencer' });
    await sqlTeste()`INSERT INTO approval_delegations (approver_id, editor_id) VALUES (${delegado.id}, ${editor.id})`;
    const demandaId = await criarDemanda(editor.id, influencer.id);
    return { editor, outroEditor, influencer, outroInfluencer, admin, delegado, demandaId };
  }
  const comentar = (demandaId: string, id: string, perfil: UsuarioSessao['perfil'] = 'Editor') =>
    executarAcao(defAdicionarComentario, { demandaId, conteudo: 'Comentário de teste' }, deps({ ...sessaoDe(id), perfil, permissoes: resolverPermissoes(perfil, []) }));

  it('permite: Editor responsável, Influencer solicitante, Administrador e Aprovador delegado', async () => {
    const c = await cenario();
    expect((await comentar(c.demandaId, c.editor.id)).ok).toBe(true);
    expect((await comentar(c.demandaId, c.influencer.id, 'Influencer')).ok).toBe(true);
    expect((await comentar(c.demandaId, c.admin.id, 'Administrador')).ok).toBe(true);
    expect((await comentar(c.demandaId, c.delegado.id, 'Influencer')).ok).toBe(true);
    expect(await listarComentarios(sqlTeste(), c.demandaId)).toHaveLength(4);
  });

  it('nega: Editor de outra equipe e Influencer de outra Demanda, sem gravar comentário nem histórico', async () => {
    const c = await cenario();
    for (const [id, perfil] of [[c.outroEditor.id, 'Editor'], [c.outroInfluencer.id, 'Influencer']] as const) {
      const r = await comentar(c.demandaId, id, perfil);
      expect(r).toMatchObject({ ok: false, mensagem: 'Você não tem permissão para esta Demanda.' });
    }
    expect(await listarComentarios(sqlTeste(), c.demandaId)).toHaveLength(0);
    expect(await listarHistorico(sqlTeste(), c.demandaId)).toHaveLength(0);
  });

  it('permite quem tem verTodasDemandas e nega o Aprovador delegado de outro Editor', async () => {
    const c = await cenario();
    const gestor = await criarUsuario({ perfil: 'Editor' });
    const sessaoGestor = { ...sessaoDe(gestor.id, { verTodasDemandas: true }) };
    expect((await executarAcao(defAdicionarComentario, { demandaId: c.demandaId, conteudo: 'Gestor' }, deps(sessaoGestor))).ok).toBe(true);
    await sqlTeste()`DELETE FROM approval_delegations WHERE approver_id = ${c.delegado.id}`;
    await sqlTeste()`INSERT INTO approval_delegations (approver_id, editor_id) VALUES (${c.delegado.id}, ${c.outroEditor.id})`;
    expect((await comentar(c.demandaId, c.delegado.id, 'Influencer')).ok).toBe(false);
  });

  it('Demanda inexistente devolve «Demanda não encontrada.»', async () => {
    const c = await cenario();
    const r = await comentar('LFNAOEXISTE', c.editor.id);
    expect(r).toMatchObject({ ok: false, mensagem: 'Demanda não encontrada.' });
  });
});

// ============================================================
// 2. Excluir comentário
// ============================================================
describe('excluirComentario', () => {
  it('dono pode excluir o próprio comentário', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const sessao = sessaoDe(u.id);

    const r = await executarAcao(
      defAdicionarComentario,
      { demandaId, conteudo: 'Para excluir' },
      deps(sessao),
    );
    expect(r.ok).toBe(true);
    const comentarioId = r.dados!.id;

    const del = await executarAcao(defExcluirComentario, { comentarioId }, deps(sessao));
    expect(del).toMatchObject({ ok: true, mensagem: 'Comentário excluído.' });

    const comentarios = await listarComentarios(sqlTeste(), demandaId);
    expect(comentarios).toHaveLength(0);
  });

  it('usuário com gerenciarUsuarios pode excluir comentário de outro', async () => {
    const autor = await criarUsuario();
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const demandaId = await criarDemanda(autor.id);

    const r = await executarAcao(
      defAdicionarComentario,
      { demandaId, conteudo: 'Comentário do editor' },
      deps(sessaoDe(autor.id)),
    );
    const comentarioId = r.dados!.id;

    const del = await executarAcao(
      defExcluirComentario,
      { comentarioId },
      deps(sessaoDe(admin.id, { gerenciarUsuarios: true })),
    );
    expect(del.ok).toBe(true);
  });

  it('usuário sem permissão não pode excluir comentário alheio', async () => {
    const autor = await criarUsuario();
    const outro = await criarUsuario();
    const demandaId = await criarDemanda(autor.id);

    const r = await executarAcao(
      defAdicionarComentario,
      { demandaId, conteudo: 'Meu comentário' },
      deps(sessaoDe(autor.id)),
    );
    const comentarioId = r.dados!.id;

    const del = await executarAcao(
      defExcluirComentario,
      { comentarioId },
      deps(sessaoDe(outro.id)),
    );
    expect(del.ok).toBe(false);
    expect(del.mensagem).toMatch(/não pode excluir/i);
  });

  it('comentário inexistente retorna erro de domínio', async () => {
    const u = await criarUsuario();
    const r = await executarAcao(
      defExcluirComentario,
      { comentarioId: 'LFNAOEXISTE' },
      deps(sessaoDe(u.id)),
    );
    expect(r.ok).toBe(false);
    expect(r.mensagem).toMatch(/não encontrado/i);
  });
});

// ============================================================
// 3. Listar comentários
// ============================================================
describe('listarComentarios', () => {
  it('retorna lista vazia para demanda sem comentários', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const comentarios = await listarComentarios(sqlTeste(), demandaId);
    expect(comentarios).toHaveLength(0);
  });

  it('retorna comentários ordenados por created_at ASC', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const sessao = sessaoDe(u.id);

    await executarAcao(defAdicionarComentario, { demandaId, conteudo: 'Primeiro' }, deps(sessao));
    await executarAcao(defAdicionarComentario, { demandaId, conteudo: 'Segundo' }, deps(sessao));

    const comentarios = await listarComentarios(sqlTeste(), demandaId);
    expect(comentarios[0]!.conteudo).toBe('Primeiro');
    expect(comentarios[1]!.conteudo).toBe('Segundo');
  });

  it('inclui nome do autor no retorno', async () => {
    const u = await criarUsuario({ nome: 'Maria Silva' });
    const demandaId = await criarDemanda(u.id);

    await executarAcao(
      defAdicionarComentario,
      { demandaId, conteudo: 'Olá!' },
      deps(sessaoDe(u.id)),
    );

    const [c] = await listarComentarios(sqlTeste(), demandaId);
    expect(c!.autorNome).toBe('Maria Silva');
  });
});

// ============================================================
// 4. Listar histórico
// ============================================================
describe('listarHistorico', () => {
  it('retorna lista vazia para demanda sem histórico', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const hist = await listarHistorico(sqlTeste(), demandaId);
    expect(hist).toHaveLength(0);
  });

  it('retorna entradas de histórico geradas por adicionarComentario', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);

    await executarAcao(
      defAdicionarComentario,
      { demandaId, conteudo: 'Comentando aqui' },
      deps(sessaoDe(u.id)),
    );

    const hist = await listarHistorico(sqlTeste(), demandaId);
    expect(hist).toHaveLength(1);
    expect(hist[0]!.acao).toBe('comentou');
    expect(hist[0]!.usuarioId).toBe(u.id);
  });

  it('histórico de excluir comentário também é registrado', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const sessao = sessaoDe(u.id);

    const r = await executarAcao(defAdicionarComentario, { demandaId, conteudo: 'Para remover' }, deps(sessao));
    await executarAcao(defExcluirComentario, { comentarioId: r.dados!.id }, deps(sessao));

    const hist = await listarHistorico(sqlTeste(), demandaId);
    expect(hist.some((h) => h.acao === 'excluiu comentário')).toBe(true);
  });
});
