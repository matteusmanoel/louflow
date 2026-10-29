import { describe, it, expect } from 'vitest';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { executarAcao, type DefinicaoAcao } from '@/lib/action';
import type { UsuarioSessao } from '@/lib/session';
import type { ZodType } from 'zod';
import { resolverPermissoes } from '@/lib/permissions';
import { listarDemandas, buscarDemanda, listarFilaDeFichas } from './consultas';
import {
  defAlterarPrioridade,
  defAssumirFicha,
  defCriarDemanda,
  defEditarDemanda,
  defExcluirDemanda,
} from './_acoes-def';

usarBancoLimpo();

/** Cria um UsuarioSessao sintético para injetar em executarAcao. */
function sessao(
  id: string,
  perfil: 'Administrador' | 'Editor' | 'Influencer' = 'Administrador',
): UsuarioSessao {
  return {
    id,
    nome: 'Usuário Teste',
    perfil,
    editorLabel: perfil === 'Editor' ? 'Editor Teste' : null,
    deveTrocarPin: false,
    permissoes: resolverPermissoes(perfil, []),
    ehAprovadorDelegado: false,
  };
}

/** Helper: executa uma ação com a sessão injetada. */
async function exec<Z extends ZodType, T>(
  def: DefinicaoAcao<Z, T>,
  entrada: unknown,
  usuario: UsuarioSessao,
) {
  return executarAcao(def, entrada, {
    obterUsuario: async () => usuario,
    sql: sqlTeste,
  });
}

async function criarDemandaDir(campos: {
  title?: string;
  format?: string;
  editor_id?: string | null;
  influencer_id?: string | null;
  status?: string;
  post_date?: string | null;
  approval_date?: string | null;
  deleted_at?: Date | null;
}): Promise<string> {
  const sql = sqlTeste();
  const id = 'LF' + Math.random().toString(16).slice(2, 12).toUpperCase();
  await sql`
    INSERT INTO demands (
      id, title, format, editor_id, influencer_id, status, post_date, approval_date, deleted_at
    ) VALUES (
      ${id},
      ${campos.title ?? 'Demanda Teste'},
      ${campos.format ?? 'Pauta'},
      ${campos.editor_id ?? null},
      ${campos.influencer_id ?? null},
      ${(campos.status as import('./consultas').DemandaStatus) ?? 'Não iniciada'},
      ${campos.post_date ?? null},
      ${campos.approval_date ?? null},
      ${campos.deleted_at ?? null}
    )
  `;
  return id;
}

// ──────────────────────────────────────────────────────────
describe('criarDemanda', () => {
  it('cria demanda com sucesso e registra histórico', async () => {
    const { id: userId } = await criarUsuario({ perfil: 'Administrador' });
    const u = sessao(userId);

    const resultado = await exec(defCriarDemanda, {
      title: 'Demanda Nova',
      format: 'Pauta',
      priority: 'Normal',
    }, u);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const sql = sqlTeste();
    const [d] = await sql<{ id: string; title: string }[]>`
      SELECT id, title FROM demands WHERE id = ${resultado.dados.id}
    `;
    expect(d).toBeDefined();
    expect(d!.title).toBe('Demanda Nova');

    const [h] = await sql<{ action: string }[]>`
      SELECT action FROM history WHERE demand_id = ${resultado.dados.id}
    `;
    expect(h?.action).toBe('Demanda criada');
  });

  it('falha sem permissão criarDemandas', async () => {
    const { id: userId } = await criarUsuario({ perfil: 'Influencer' });
    const u = sessao(userId, 'Influencer');

    const resultado = await exec(defCriarDemanda, {
      title: 'Sem permissão',
      format: 'Pauta',
    }, u);

    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/permissão/i);
  });

  it('atribui editor padrão de Cortes automaticamente', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const u = sessao(adminId);

    await sqlTeste()`
      INSERT INTO user_permissions (user_id, permission_key, granted)
      VALUES (${editorId}, 'editorPadraoCortes', true)
    `;

    const resultado = await exec(defCriarDemanda, {
      title: 'Corte do Programa',
      format: 'Cortes',
      priority: 'Normal',
    }, u);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const [d] = await sqlTeste()<{ editor_id: string }[]>`
      SELECT editor_id FROM demands WHERE id = ${resultado.dados.id}
    `;
    expect(d?.editor_id).toBe(editorId);
  });

  it('falha ao criar Cortes sem editor padrão configurado', async () => {
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const u = sessao(adminId);

    const resultado = await exec(defCriarDemanda, {
      title: 'Cortes sem editor',
      format: 'Cortes',
    }, u);

    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/editor padrão/i);
  });
});

// ──────────────────────────────────────────────────────────
describe('excluirDemanda (soft delete)', () => {
  it('faz soft delete e registra na lixeira e no histórico', async () => {
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const u = sessao(adminId);

    const demandaId = await criarDemandaDir({ title: 'Para excluir' });

    const resultado = await exec(defExcluirDemanda, { id: demandaId }, u);
    expect(resultado.ok).toBe(true);

    const sql = sqlTeste();
    const [d] = await sql<{ deleted_at: Date | null }[]>`
      SELECT deleted_at FROM demands WHERE id = ${demandaId}
    `;
    expect(d?.deleted_at).not.toBeNull();

    const [trash] = await sql<{ demand_id: string }[]>`
      SELECT demand_id FROM demand_trash WHERE demand_id = ${demandaId}
    `;
    expect(trash?.demand_id).toBe(demandaId);

    const [h] = await sql<{ action: string }[]>`
      SELECT action FROM history WHERE demand_id = ${demandaId}
    `;
    expect(h?.action).toMatch(/lixeira/i);
  });

  it('não aparece na listagem após soft delete', async () => {
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const u = sessao(adminId);

    const demandaId = await criarDemandaDir({ title: 'Invisível' });

    await exec(defExcluirDemanda, { id: demandaId }, u);

    const demandas = await listarDemandas(sqlTeste(), u);
    const ids = demandas.map((d) => d.id);
    expect(ids).not.toContain(demandaId);
  });
});

// ──────────────────────────────────────────────────────────
describe('listarDemandas — visibilidade', () => {
  it('sem verTodasDemandas vê apenas demandas próprias (editor ou influencer)', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const { id: outroEditorId } = await criarUsuario({ perfil: 'Editor' });

    const d1 = await criarDemandaDir({ editor_id: editorId });
    const d2 = await criarDemandaDir({ influencer_id: editorId });
    await criarDemandaDir({ editor_id: outroEditorId });

    const uEditor: UsuarioSessao = {
      id: editorId,
      nome: 'Editor',
      perfil: 'Editor',
      editorLabel: 'Editor',
      deveTrocarPin: false,
      permissoes: resolverPermissoes('Editor', []),
      ehAprovadorDelegado: false,
    };

    const demandas = await listarDemandas(sqlTeste(), uEditor);
    const ids = demandas.map((d) => d.id);

    expect(ids).toContain(d1);
    expect(ids).toContain(d2);
    // Demanda do outro editor não deve aparecer
    expect(ids.filter((id) => id === outroEditorId)).toHaveLength(0);
  });

  it('com verTodasDemandas vê todas as demandas', async () => {
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });

    const d1 = await criarDemandaDir({ editor_id: editorId });
    const d2 = await criarDemandaDir({ editor_id: null });

    const u = sessao(adminId);
    const demandas = await listarDemandas(sqlTeste(), u);
    const ids = demandas.map((d) => d.id);

    expect(ids).toContain(d1);
    expect(ids).toContain(d2);
  });
});

// ──────────────────────────────────────────────────────────
describe('cálculo de demanda atrasada', () => {
  it('demanda com prazo passado e status não-final é atrasada', async () => {
    const demandaId = await criarDemandaDir({
      post_date: '2020-01-01',
      status: 'Em execução',
    });

    const demanda = await buscarDemanda(sqlTeste(), demandaId);
    expect(demanda?.atrasada).toBe(true);
  });

  it('demanda Concluída com prazo passado não é atrasada', async () => {
    const sql = sqlTeste();
    const demandaId = await criarDemandaDir({ post_date: '2020-01-01' });
    await sql`UPDATE demands SET status = 'Concluída', completed_at = now() WHERE id = ${demandaId}`;

    const demanda = await buscarDemanda(sql, demandaId);
    expect(demanda?.atrasada).toBe(false);
  });

  it('demanda em Aprovação com prazo passado não é atrasada', async () => {
    const demandaId = await criarDemandaDir({
      post_date: '2020-01-01',
      status: 'Aprovação',
    });

    const demanda = await buscarDemanda(sqlTeste(), demandaId);
    expect(demanda?.atrasada).toBe(false);
  });

  it('usa approval_date como fallback quando post_date é null', async () => {
    const demandaId = await criarDemandaDir({
      post_date: null,
      approval_date: '2020-01-01',
      status: 'Não iniciada',
    });

    const demanda = await buscarDemanda(sqlTeste(), demandaId);
    expect(demanda?.prazo_efetivo).toBe('2020-01-01');
    expect(demanda?.atrasada).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────
describe('assumirFicha', () => {
  it('editor assume demanda da Fila de Fichas e registra histórico', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const u = sessao(editorId, 'Editor');

    const demandaId = await criarDemandaDir({
      format: 'Ficha técnica',
      editor_id: null,
    });

    const resultado = await exec(defAssumirFicha, { demandaId }, u);
    expect(resultado.ok).toBe(true);

    const [d] = await sqlTeste()<{ editor_id: string }[]>`
      SELECT editor_id FROM demands WHERE id = ${demandaId}
    `;
    expect(d?.editor_id).toBe(editorId);

    const [h] = await sqlTeste()<{ action: string }[]>`
      SELECT action FROM history WHERE demand_id = ${demandaId}
    `;
    expect(h?.action).toMatch(/assumiu/i);
  });

  it('falha ao tentar assumir demanda de Cortes', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const u = sessao(editorId, 'Editor');

    const demandaId = await criarDemandaDir({
      format: 'Cortes',
      editor_id: null,
    });

    const resultado = await exec(defAssumirFicha, { demandaId }, u);
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/cortes/i);
  });

  it('falha se demanda já tem editor', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const { id: outroId } = await criarUsuario({ perfil: 'Editor' });
    const u = sessao(editorId, 'Editor');

    const demandaId = await criarDemandaDir({
      format: 'Ficha técnica',
      editor_id: outroId,
    });

    const resultado = await exec(defAssumirFicha, { demandaId }, u);
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/editor/i);
  });
});

// ──────────────────────────────────────────────────────────
describe('listarFilaDeFichas', () => {
  it('retorna demandas sem editor exceto Cortes', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });

    const fichaId = await criarDemandaDir({ format: 'Ficha técnica', editor_id: null });
    await criarDemandaDir({ format: 'Ficha técnica', editor_id: editorId }); // tem editor
    await criarDemandaDir({ format: 'Cortes', editor_id: null }); // excluído da fila
    const pautaId = await criarDemandaDir({ format: 'Pauta', editor_id: null }); // pauta sem editor: entra

    const fila = await listarFilaDeFichas(sqlTeste());
    const ids = fila.map((d) => d.id);

    expect(ids).toContain(fichaId);
    expect(ids).toContain(pautaId);
    // Demanda com editor não deve estar na fila
    const comEditorIds = fila.filter((d) => d.editor_id !== null).map((d) => d.id);
    expect(comEditorIds).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────
describe('formato Cortes — editor padrão atribuído e não entra na Fila', () => {
  it('demanda Cortes recebe editorPadraoCortes no momento da criação', async () => {
    const { id: editorCortes } = await criarUsuario({ perfil: 'Editor' });
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const u = sessao(adminId);

    await sqlTeste()`
      INSERT INTO user_permissions (user_id, permission_key, granted)
      VALUES (${editorCortes}, 'editorPadraoCortes', true)
    `;

    const resultado = await exec(defCriarDemanda, {
      title: 'Corte Destino Iguaçu',
      format: 'Cortes',
      editorial_line: 'Viral',
      source_program: 'Destino Iguaçu News',
      clips_count: 5,
    }, u);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const [d] = await sqlTeste()<{ editor_id: string }[]>`
      SELECT editor_id FROM demands WHERE id = ${resultado.dados.id}
    `;
    expect(d?.editor_id).toBe(editorCortes);

    // Não entra na Fila de Fichas
    const fila = await listarFilaDeFichas(sqlTeste());
    const ids = fila.map((dem) => dem.id);
    expect(ids).not.toContain(resultado.dados.id);
  });
});

// ──────────────────────────────────────────────────────────
describe('editarDemanda', () => {
  it('edita uma demanda existente e registra histórico', async () => {
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const u = sessao(adminId);

    const demandaId = await criarDemandaDir({ title: 'Original' });

    const resultado = await exec(defEditarDemanda, {
      id: demandaId,
      title: 'Editada',
      format: 'Pauta',
      priority: 'Alta',
    }, u);

    expect(resultado.ok).toBe(true);

    const [d] = await sqlTeste()<{ title: string; priority: string }[]>`
      SELECT title, priority FROM demands WHERE id = ${demandaId}
    `;
    expect(d?.title).toBe('Editada');
    expect(d?.priority).toBe('Alta');

    const [h] = await sqlTeste()<{ action: string }[]>`
      SELECT action FROM history WHERE demand_id = ${demandaId}
    `;
    expect(h?.action).toBe('Demanda editada');
  });

  it('falha sem permissão editarDemandas', async () => {
    const { id: influencerId } = await criarUsuario({ perfil: 'Influencer' });
    const u = sessao(influencerId, 'Influencer');

    const demandaId = await criarDemandaDir({});

    const resultado = await exec(defEditarDemanda, {
      id: demandaId,
      title: 'Tentativa',
      format: 'Pauta',
      priority: 'Normal',
    }, u);

    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/permissão/i);
  });
});

describe('alterarPrioridade', () => {
  it('grava só a prioridade e registra o histórico', async () => {
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const u = sessao(adminId);
    const demandaId = await criarDemandaDir({ title: 'Prioridade' });

    const igual = await exec(defAlterarPrioridade, { id: demandaId, priority: 'Normal' }, u);
    expect(igual.ok).toBe(true);
    const historicoIgual = await sqlTeste()<{ action: string }[]>`
      SELECT action FROM history WHERE demand_id = ${demandaId}
    `;
    expect(historicoIgual).toHaveLength(0);

    const resultado = await exec(defAlterarPrioridade, { id: demandaId, priority: 'Urgente' }, u);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.mensagem).toBe('Prioridade atualizada.');

    const [d] = await sqlTeste()<{ priority: string; title: string }[]>`
      SELECT priority, title FROM demands WHERE id = ${demandaId}
    `;
    expect(d?.priority).toBe('Urgente');
    expect(d?.title).toBe('Prioridade');

    const [h] = await sqlTeste()<{ action: string; details: string }[]>`
      SELECT action, details FROM history WHERE demand_id = ${demandaId}
    `;
    expect(h?.action).toBe('Prioridade alterada');
    expect(h?.details).toBe('Normal → Urgente');
  });

  it('falha sem a permissão alterarPrioridade', async () => {
    const { id: influencerId } = await criarUsuario({ perfil: 'Influencer' });
    const u = sessao(influencerId, 'Influencer');
    const demandaId = await criarDemandaDir({});

    const resultado = await exec(defAlterarPrioridade, { id: demandaId, priority: 'Alta' }, u);
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/permissão/i);
  });

  it('falha quando a demanda não existe', async () => {
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const resultado = await exec(
      defAlterarPrioridade,
      { id: 'LFinexistente', priority: 'Alta' },
      sessao(adminId),
    );
    expect(resultado.ok).toBe(false);
    expect(resultado.mensagem).toMatch(/não encontrada/i);
  });
});
