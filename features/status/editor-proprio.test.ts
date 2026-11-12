import { describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import { resolverPermissoes, type Perfil } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { defRegistrarEntrega } from '@/features/aprovacoes/_acoes-def';
import { defAlterarStatus } from './acoes-def';
import { destinosStatus, responsavelPodeIniciar } from './transicoes';

usarBancoLimpo();

/** Sessão com as permissões padrão do Perfil: o Editor padrão NÃO tem alterarStatus nem editarDemandas. */
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

function deps(usuario: UsuarioSessao) {
  return { obterUsuario: async () => usuario, sql: () => sqlTeste() };
}

let seq = 0;
async function demanda(status: string, editorId: string | null, extra: { lixeira?: boolean } = {}) {
  seq += 1;
  const id = `LFep${String(seq).padStart(6, '0')}`;
  const sql = sqlTeste();
  await sql`
    INSERT INTO demands (id, title, format, status, editor_id, deleted_at)
    VALUES (${id}, 'Demanda do Editor', 'Reels', ${status}, ${editorId}, ${extra.lixeira ? new Date() : null})`;
  return id;
}

async function estado(demandaId: string) {
  const sql = sqlTeste();
  const [d] = await sql<{ status: string; editor_id: string | null }[]>`
    SELECT status, editor_id FROM demands WHERE id = ${demandaId}`;
  const [c] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM editing_cycles WHERE demand_id = ${demandaId}`;
  const [e] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM deliveries WHERE demand_id = ${demandaId}`;
  const [h] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM history WHERE demand_id = ${demandaId}`;
  return { status: d?.status, editor: d?.editor_id, ciclos: c!.n, entregas: e!.n, historico: h!.n };
}

describe('Editor inicia a própria Demanda (sem alterarStatus)', () => {
  it('o padrão do Editor continua sem alterarStatus nem editarDemandas', () => {
    const p = resolverPermissoes('Editor', []);
    expect(p.alterarStatus).toBe(false);
    expect(p.editarDemandas).toBe(false);
  });

  it('o dono inicia de Não iniciada e de Ajustes solicitados', async () => {
    const ed = await criarUsuario({ perfil: 'Editor' });
    for (const origem of ['Não iniciada', 'Ajustes solicitados']) {
      const id = await demanda(origem, ed.id);
      const res = await executarAcao(defAlterarStatus, { demandaId: id, novoStatus: 'Em execução' }, deps(sessao(ed.id, 'Editor')));
      expect(res.ok, origem).toBe(true);
      const e = await estado(id);
      expect(e.status).toBe('Em execução');
      expect(e.ciclos).toBe(1); // a máquina de status abriu o ciclo
      expect(e.historico).toBe(1);
    }
  });

  it('Editor de outra Demanda é recusado na ação direta e nada muda', async () => {
    const dono = await criarUsuario({ perfil: 'Editor' });
    const outro = await criarUsuario({ perfil: 'Editor' });
    const id = await demanda('Não iniciada', dono.id);
    const antes = await estado(id);

    const res = await executarAcao(defAlterarStatus, { demandaId: id, novoStatus: 'Em execução' }, deps(sessao(outro.id, 'Editor')));

    expect(res).toEqual({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
    expect(await estado(id)).toEqual(antes);
  });

  it('Demanda sem Editor, na Lixeira ou inexistente: mesma recusa, sem revelar a existência', async () => {
    const ed = await criarUsuario({ perfil: 'Editor' });
    const semEditor = await demanda('Não iniciada', null);
    const naLixeira = await demanda('Não iniciada', ed.id, { lixeira: true });
    const antes = [await estado(semEditor), await estado(naLixeira)];

    for (const id of [semEditor, naLixeira, 'LFinexistente']) {
      const res = await executarAcao(defAlterarStatus, { demandaId: id, novoStatus: 'Em execução' }, deps(sessao(ed.id, 'Editor')));
      expect(res).toEqual({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
    }
    expect([await estado(semEditor), await estado(naLixeira)]).toEqual(antes);
  });

  it('o dono só inicia: pausar, cancelar e entregar por esta ação seguem recusados', async () => {
    const ed = await criarUsuario({ perfil: 'Editor' });
    const naoIniciada = await demanda('Não iniciada', ed.id);
    const emExecucao = await demanda('Em execução', ed.id);
    const pausada = await demanda('Pausada', ed.id);
    const casos: [string, string][] = [
      [naoIniciada, 'Cancelada'],
      [emExecucao, 'Pausada'],
      [emExecucao, 'Aprovação'],
      [emExecucao, 'Cancelada'],
      [pausada, 'Em execução'],
      [pausada, 'Cancelada'],
    ];
    for (const [id, novoStatus] of casos) {
      const antes = await estado(id);
      const res = await executarAcao(defAlterarStatus, { demandaId: id, novoStatus, motivo: 'x' }, deps(sessao(ed.id, 'Editor')));
      expect(res.ok, `${antes.status} → ${novoStatus}`).toBe(false);
      expect(await estado(id)).toEqual(antes);
    }
  });

  it('Influencer e Prêmios continuam recusados, mesmo sendo apontados como Editor da Demanda', async () => {
    const inf = await criarUsuario({ perfil: 'Influencer' });
    const premios = await criarUsuario({ perfil: 'Premios' });
    for (const [u, perfil] of [[inf, 'Influencer'], [premios, 'Premios']] as const) {
      const id = await demanda('Não iniciada', u.id);
      const antes = await estado(id);
      const res = await executarAcao(defAlterarStatus, { demandaId: id, novoStatus: 'Em execução' }, deps(sessao(u.id, perfil)));
      expect(res).toEqual({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
      expect(await estado(id)).toEqual(antes);
    }
  });

  it('quem tem alterarStatus continua agindo em qualquer Demanda', async () => {
    const adm = await criarUsuario({ perfil: 'Administrador' });
    const ed = await criarUsuario({ perfil: 'Editor' });
    const id = await demanda('Em execução', ed.id);
    const res = await executarAcao(defAlterarStatus, { demandaId: id, novoStatus: 'Pausada' }, deps(sessao(adm.id, 'Administrador')));
    expect(res.ok).toBe(true);
  });

  it('a interface espelha a regra: iniciar só para o dono e só de Não iniciada/Ajustes', () => {
    expect(responsavelPodeIniciar('Não iniciada', 'Em execução')).toBe(true);
    expect(responsavelPodeIniciar('Ajustes solicitados', 'Em execução')).toBe(true);
    expect(responsavelPodeIniciar('Pausada', 'Em execução')).toBe(false);
    expect(responsavelPodeIniciar('Não iniciada', 'Cancelada')).toBe(false);

    const base = { podeMover: false, podeEntregar: false };
    expect(destinosStatus('Não iniciada', { ...base, podeIniciar: true })).toEqual(['Em execução']);
    expect(destinosStatus('Não iniciada', base)).toEqual([]);
    expect(destinosStatus('Em execução', { ...base, podeIniciar: true })).toEqual([]);
    expect(destinosStatus('Em execução', { ...base, podeIniciar: true, podeEntregar: true })).toEqual(['Aprovação']);
  });
});

describe('Editor registra entrega só na própria Demanda (sem editarDemandas)', () => {
  const entrada = (demandaId: string) => ({ demandaId, arquivoUrl: 'https://drive.exemplo.test/entrega/1' });

  it('o dono registra a entrega: nasce a versão 1 em nome dele e a Demanda vai a Aprovação', async () => {
    const ed = await criarUsuario({ perfil: 'Editor' });
    const id = await demanda('Em execução', ed.id);

    const res = await executarAcao(defRegistrarEntrega, entrada(id), deps(sessao(ed.id, 'Editor')));

    expect(res.ok).toBe(true);
    const e = await estado(id);
    expect(e.status).toBe('Aprovação');
    expect(e.entregas).toBe(1);
    const [ent] = await sqlTeste()<{ editor_id: string; version: number }[]>`
      SELECT editor_id, version FROM deliveries WHERE demand_id = ${id}`;
    expect(ent).toMatchObject({ editor_id: ed.id, version: 1 });
  });

  it('Editor de outra Demanda é recusado na ação direta e nada muda', async () => {
    const dono = await criarUsuario({ perfil: 'Editor' });
    const outro = await criarUsuario({ perfil: 'Editor' });
    const id = await demanda('Em execução', dono.id);
    const antes = await estado(id);

    const res = await executarAcao(defRegistrarEntrega, entrada(id), deps(sessao(outro.id, 'Editor')));

    expect(res).toEqual({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
    expect(await estado(id)).toEqual(antes);
    expect(antes.entregas).toBe(0);
  });

  it('sem Editor, na Lixeira ou inexistente: mesma recusa', async () => {
    const ed = await criarUsuario({ perfil: 'Editor' });
    const semEditor = await demanda('Em execução', null);
    const naLixeira = await demanda('Em execução', ed.id, { lixeira: true });
    for (const id of [semEditor, naLixeira, 'LFinexistente']) {
      const res = await executarAcao(defRegistrarEntrega, entrada(id), deps(sessao(ed.id, 'Editor')));
      expect(res).toEqual({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
    }
    expect((await estado(semEditor)).entregas).toBe(0);
    expect((await estado(naLixeira)).entregas).toBe(0);
  });

  it('o dono continua preso à regra de status: só entrega Em execução', async () => {
    const ed = await criarUsuario({ perfil: 'Editor' });
    const id = await demanda('Não iniciada', ed.id);
    const res = await executarAcao(defRegistrarEntrega, entrada(id), deps(sessao(ed.id, 'Editor')));
    expect(res.ok).toBe(false);
    expect((await estado(id)).entregas).toBe(0);
  });

  it('Influencer é recusado e quem tem editarDemandas segue entregando em qualquer Demanda', async () => {
    const inf = await criarUsuario({ perfil: 'Influencer' });
    const adm = await criarUsuario({ perfil: 'Administrador' });
    const ed = await criarUsuario({ perfil: 'Editor' });
    const id = await demanda('Em execução', ed.id);

    const negado = await executarAcao(defRegistrarEntrega, entrada(id), deps(sessao(inf.id, 'Influencer')));
    expect(negado).toEqual({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
    expect((await estado(id)).entregas).toBe(0);

    const ok = await executarAcao(defRegistrarEntrega, entrada(id), deps(sessao(adm.id, 'Administrador')));
    expect(ok.ok).toBe(true);
  });
});
