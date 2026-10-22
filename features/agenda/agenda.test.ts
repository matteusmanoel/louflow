import { describe, it, expect } from 'vitest';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import type { UsuarioSessao } from '@/lib/session';
import { resolverPermissoes } from '@/lib/permissions';
import { defAgendarPostagem, defCancelarAgendamento } from './actions';
import { listarAgendaDb } from './consultas';

usarBancoLimpo();

// ---- helpers de sessão ----

function sessaoDe(
  id: string,
  permissoes: Partial<ReturnType<typeof resolverPermissoes>> = {},
): UsuarioSessao {
  return {
    id,
    nome: 'Teste',
    perfil: 'Editor',
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: { ...resolverPermissoes('Editor', []), ...permissoes },
    ehAprovadorDelegado: false,
  };
}

const deps = (usuario: UsuarioSessao) => ({
  obterUsuario: async () => usuario,
  sql: sqlTeste,
});

// ---- helpers de fixture ----

async function criarDemanda(campos: {
  status?: string;
  post_date?: string | null;
  influencer_id?: string | null;
  editor_id?: string | null;
  created_by?: string | null;
}): Promise<string> {
  const sql = sqlTeste();
  const id = 'LF' + Math.random().toString(16).slice(2, 12).toUpperCase();
  await sql`
    INSERT INTO demands (id, title, format, status, post_date, influencer_id, editor_id, created_by)
    VALUES (
      ${id},
      'Demanda Teste',
      'Pauta',
      ${(campos.status ?? 'Não iniciada') as 'Não iniciada'},
      ${campos.post_date ?? null},
      ${campos.influencer_id ?? null},
      ${campos.editor_id ?? null},
      ${campos.created_by ?? null}
    )`;
  return id;
}

// ============================================================
// 1. agendarPostagem
// ============================================================
describe('agendarPostagem', () => {
  it('define post_date em demanda Não iniciada', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemanda({});
    const sessao = sessaoDe(uid, { editarDemandas: true });

    const r = await executarAcao(defAgendarPostagem, { demandaId, postDate: '2026-11-15' }, deps(sessao));

    expect(r).toMatchObject({ ok: true, mensagem: 'Postagem agendada.' });
    const [linha] = await sqlTeste()`SELECT post_date FROM demands WHERE id = ${demandaId}`;
    // post_date retorna como Date; verificar o dia via ISO string
    expect(new Date(linha!.post_date).toISOString().startsWith('2026-11-15')).toBe(true);
  });

  it('atualiza post_date já existente', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemanda({ post_date: '2026-10-01' });
    const sessao = sessaoDe(uid, { editarDemandas: true });

    const r = await executarAcao(defAgendarPostagem, { demandaId, postDate: '2026-11-20' }, deps(sessao));

    expect(r.ok).toBe(true);
  });

  it('registra histórico após agendar', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemanda({});
    const sessao = sessaoDe(uid, { editarDemandas: true });

    await executarAcao(defAgendarPostagem, { demandaId, postDate: '2026-11-15' }, deps(sessao));

    const [hist] = await sqlTeste()`
      SELECT action FROM history WHERE demand_id = ${demandaId} ORDER BY id DESC LIMIT 1`;
    expect(hist?.action).toBe('postagem_agendada');
  });

  it('falha sem permissão editarDemandas', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemanda({});
    const sessao = sessaoDe(uid, { editarDemandas: false });

    const r = await executarAcao(defAgendarPostagem, { demandaId, postDate: '2026-11-15' }, deps(sessao));

    expect(r).toMatchObject({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
  });

  it('falha para demanda Cancelada', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemanda({ status: 'Cancelada' });
    const sessao = sessaoDe(uid, { editarDemandas: true });

    const r = await executarAcao(defAgendarPostagem, { demandaId, postDate: '2026-11-15' }, deps(sessao));

    expect(r).toMatchObject({ ok: false, mensagem: 'Não é possível agendar uma demanda Cancelada.' });
  });

  it('falha para demanda Concluída', async () => {
    const { id: uid } = await criarUsuario();
    // Demanda Concluída exige completed_at preenchido (CHECK do banco)
    const sql = sqlTeste();
    const id = 'LF' + Math.random().toString(16).slice(2, 12).toUpperCase();
    await sql`
      INSERT INTO demands (id, title, format, status, completed_at)
      VALUES (${id}, 'Concluída', 'Pauta', 'Concluída', now())`;
    const sessao = sessaoDe(uid, { editarDemandas: true });

    const r = await executarAcao(defAgendarPostagem, { demandaId: id, postDate: '2026-11-15' }, deps(sessao));

    expect(r).toMatchObject({ ok: false, mensagem: 'Não é possível agendar uma demanda Concluída.' });
  });

  it('falha para demanda inexistente', async () => {
    const { id: uid } = await criarUsuario();
    const sessao = sessaoDe(uid, { editarDemandas: true });

    const r = await executarAcao(defAgendarPostagem, { demandaId: 'LFNAOEXISTE999', postDate: '2026-11-15' }, deps(sessao));

    expect(r).toMatchObject({ ok: false, mensagem: 'Demanda não encontrada.' });
  });

  it('falha com data inválida', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemanda({});
    const sessao = sessaoDe(uid, { editarDemandas: true });

    const r = await executarAcao(defAgendarPostagem, { demandaId, postDate: 'não-é-data' }, deps(sessao));

    expect(r.ok).toBe(false);
  });
});

// ============================================================
// 2. cancelarAgendamento
// ============================================================
describe('cancelarAgendamento', () => {
  it('remove post_date de demanda agendada', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemanda({ post_date: '2026-11-15' });
    const sessao = sessaoDe(uid, { editarDemandas: true });

    const r = await executarAcao(defCancelarAgendamento, { demandaId }, deps(sessao));

    expect(r).toMatchObject({ ok: true, mensagem: 'Agendamento cancelado.' });
    const [linha] = await sqlTeste()`SELECT post_date FROM demands WHERE id = ${demandaId}`;
    expect(linha!.post_date).toBeNull();
  });

  it('registra histórico após cancelar', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemanda({ post_date: '2026-11-15' });
    const sessao = sessaoDe(uid, { editarDemandas: true });

    await executarAcao(defCancelarAgendamento, { demandaId }, deps(sessao));

    const [hist] = await sqlTeste()`
      SELECT action FROM history WHERE demand_id = ${demandaId} ORDER BY id DESC LIMIT 1`;
    expect(hist?.action).toBe('agendamento_cancelado');
  });

  it('falha sem permissão editarDemandas', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemanda({ post_date: '2026-11-15' });
    const sessao = sessaoDe(uid, { editarDemandas: false });

    const r = await executarAcao(defCancelarAgendamento, { demandaId }, deps(sessao));

    expect(r).toMatchObject({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
  });

  it('falha se demanda não tem post_date', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemanda({});
    const sessao = sessaoDe(uid, { editarDemandas: true });

    const r = await executarAcao(defCancelarAgendamento, { demandaId }, deps(sessao));

    expect(r).toMatchObject({ ok: false, mensagem: 'Esta demanda não tem data de postagem agendada.' });
  });

  it('falha para demanda Cancelada', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemanda({ status: 'Cancelada', post_date: '2026-11-15' });
    const sessao = sessaoDe(uid, { editarDemandas: true });

    const r = await executarAcao(defCancelarAgendamento, { demandaId }, deps(sessao));

    expect(r).toMatchObject({ ok: false });
  });

  it('falha para demanda inexistente', async () => {
    const { id: uid } = await criarUsuario();
    const sessao = sessaoDe(uid, { editarDemandas: true });

    const r = await executarAcao(defCancelarAgendamento, { demandaId: 'LFNAOEXISTE000' }, deps(sessao));

    expect(r).toMatchObject({ ok: false, mensagem: 'Demanda não encontrada.' });
  });
});

// ============================================================
// 3. listarAgendaDb
// ============================================================
describe('listarAgendaDb', () => {
  it('retorna demandas do mês correto', async () => {
    const { id: uid } = await criarUsuario();
    const sessao: UsuarioSessao = {
      id: uid, nome: 'Teste', perfil: 'Administrador',
      editorLabel: null, deveTrocarPin: false,
      permissoes: resolverPermissoes('Administrador', []),
      ehAprovadorDelegado: false,
    };

    await criarDemanda({ post_date: '2026-11-10', editor_id: uid });
    await criarDemanda({ post_date: '2026-11-25', editor_id: uid });
    await criarDemanda({ post_date: '2026-10-31', editor_id: uid }); // mês diferente

    const resultado = await listarAgendaDb({ mes: 11, ano: 2026 }, sessao, sqlTeste());

    expect(resultado).toHaveLength(2);
    expect(resultado.every((d) => new Date(d.postDate).getMonth() === 10)).toBe(true); // mês 11 = índice 10
  });

  it('usuario sem verTodasDemandas vê apenas as próprias', async () => {
    const { id: uid1 } = await criarUsuario();
    const { id: uid2 } = await criarUsuario();

    await criarDemanda({ post_date: '2026-11-10', editor_id: uid1 });
    await criarDemanda({ post_date: '2026-11-15', editor_id: uid2 }); // de outro usuário

    const sessao: UsuarioSessao = {
      id: uid1, nome: 'Editor 1', perfil: 'Editor',
      editorLabel: null, deveTrocarPin: false,
      permissoes: resolverPermissoes('Editor', []),
      ehAprovadorDelegado: false,
    };

    const resultado = await listarAgendaDb({ mes: 11, ano: 2026 }, sessao, sqlTeste());

    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.editorId).toBe(uid1);
  });

  it('Administrador com verTodasDemandas vê tudo', async () => {
    const { id: uid1 } = await criarUsuario();
    const { id: uid2 } = await criarUsuario();

    await criarDemanda({ post_date: '2026-11-10', editor_id: uid1 });
    await criarDemanda({ post_date: '2026-11-15', editor_id: uid2 });

    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const sessaoAdmin: UsuarioSessao = {
      id: adminId, nome: 'Admin', perfil: 'Administrador',
      editorLabel: null, deveTrocarPin: false,
      permissoes: resolverPermissoes('Administrador', []),
      ehAprovadorDelegado: false,
    };

    const resultado = await listarAgendaDb({ mes: 11, ano: 2026 }, sessaoAdmin, sqlTeste());

    expect(resultado.length).toBeGreaterThanOrEqual(2);
  });

  it('retorna array vazio quando não há postagens no mês', async () => {
    const { id: uid } = await criarUsuario({ perfil: 'Administrador' });
    const sessao: UsuarioSessao = {
      id: uid, nome: 'Admin', perfil: 'Administrador',
      editorLabel: null, deveTrocarPin: false,
      permissoes: resolverPermissoes('Administrador', []),
      ehAprovadorDelegado: false,
    };

    const resultado = await listarAgendaDb({ mes: 1, ano: 2020 }, sessao, sqlTeste());

    expect(resultado).toHaveLength(0);
  });

  it('não retorna demandas deletadas', async () => {
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const sessao: UsuarioSessao = {
      id: adminId, nome: 'Admin', perfil: 'Administrador',
      editorLabel: null, deveTrocarPin: false,
      permissoes: resolverPermissoes('Administrador', []),
      ehAprovadorDelegado: false,
    };

    // Cria demanda deletada diretamente
    const sql = sqlTeste();
    const id = 'LF' + Math.random().toString(16).slice(2, 12).toUpperCase();
    await sql`
      INSERT INTO demands (id, title, format, status, post_date, deleted_at)
      VALUES (${id}, 'Deletada', 'Pauta', 'Cancelada', '2026-11-10', now())`;

    const resultado = await listarAgendaDb({ mes: 11, ano: 2026 }, sessao, sqlTeste());
    expect(resultado.every((d) => d.id !== id)).toBe(true);
  });
});
