import { describe, expect, it } from 'vitest';
import { executarAcao } from '@/lib/action';
import type { Permissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { defConfirmarRecebimento, defAdiarEntrega } from './actions';
import { listarPendencias, listarAdiamentos } from './consultas';

usarBancoLimpo();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PERMISSOES_VAZIAS: Permissoes = {
  criarDemandas: false,
  definirOutroEditor: false,
  verTodasDemandas: false,
  editarDemandas: false,
  atribuirEditor: false,
  alterarStatus: false,
  alterarPrioridade: false,
  excluirDemandas: false,
  enviarFicha: false,
  verAgenda: false,
  gerenciarAgenda: false,
  verCaptacoes: false,
  gerenciarCaptacoes: false,
  acessarCortes: false,
  verAbaCortes: false,
  verRelatorios: false,
  usarAnalista: false,
  gerenciarUsuarios: false,
  verLixeira: false,
  verSorteios: false,
  operarDrone: false,
  editorPadraoCortes: false,
};

function sessao(id: string, perm: Partial<Permissoes> = {}): UsuarioSessao {
  return {
    id,
    nome: 'Influencer Teste',
    perfil: 'Influencer',
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: { ...PERMISSOES_VAZIAS, ...perm },
    ehAprovadorDelegado: false,
  };
}

function deps(usuario: UsuarioSessao) {
  return { obterUsuario: async () => usuario, sql: () => sqlTeste() };
}

let contador = 0;
async function criarDemanda(
  influencerId: string | null = null,
  status = 'Aprovação',
  postDate: string | null = null,
): Promise<string> {
  contador += 1;
  const id = `LFPEND${String(contador).padStart(8, '0')}`;
  const sql = sqlTeste();
  await sql`
    INSERT INTO demands (id, title, format, status, priority, influencer_id, post_date)
    VALUES (
      ${id},
      ${'Demanda Pendencias ' + contador},
      ${'Vídeo'},
      ${status},
      ${'Normal'},
      ${influencerId},
      ${postDate}
    )`;
  return id;
}

// ---------------------------------------------------------------------------
// listarPendencias
// ---------------------------------------------------------------------------

describe('listarPendencias', () => {
  it('retorna demandas em Aprovação do influencer', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    await criarDemanda(influId, 'Aprovação');
    await criarDemanda(influId, 'Aprovação');

    const lista = await listarPendencias(influId);
    expect(lista).toHaveLength(2);
    expect(lista.every((p) => p.status === 'Aprovação')).toBe(true);
  });

  it('não inclui demandas de outros influencers', async () => {
    const { id: influId1 } = await criarUsuario({ perfil: 'Influencer' });
    const { id: influId2 } = await criarUsuario({ perfil: 'Influencer' });
    await criarDemanda(influId1, 'Aprovação');

    const lista = await listarPendencias(influId2);
    expect(lista).toHaveLength(0);
  });

  it('não inclui demandas excluídas (deleted_at IS NOT NULL)', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    const demandaId = await criarDemanda(influId, 'Aprovação');
    const sql = sqlTeste();
    await sql`UPDATE demands SET deleted_at = now() WHERE id = ${demandaId}`;

    const lista = await listarPendencias(influId);
    expect(lista).toHaveLength(0);
  });

  it('não inclui demandas em outros status', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    await criarDemanda(influId, 'Em execução');
    await criarDemanda(influId, 'Não iniciada');

    const lista = await listarPendencias(influId);
    expect(lista).toHaveLength(0);
  });

  it('marca prazoAtrasado corretamente', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    const passado = '2020-01-01';
    const futuro = '2099-12-31';
    await criarDemanda(influId, 'Aprovação', passado);
    await criarDemanda(influId, 'Aprovação', futuro);

    const lista = await listarPendencias(influId);
    expect(lista).toHaveLength(2);
    const atrasada = lista.find((p) => p.dataEntrega?.toISOString().startsWith('2020'));
    const naoAtrasada = lista.find((p) => p.dataEntrega?.toISOString().startsWith('2099'));
    expect(atrasada?.prazoAtrasado).toBe(true);
    expect(naoAtrasada?.prazoAtrasado).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// confirmarRecebimento
// ---------------------------------------------------------------------------

describe('confirmarRecebimento', () => {
  it('registra histórico de recebimento confirmado', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    const demandaId = await criarDemanda(influId, 'Aprovação');
    const influencer = sessao(influId);

    const res = await executarAcao(defConfirmarRecebimento, { demandaId }, deps(influencer));

    expect(res.ok).toBe(true);

    const sql = sqlTeste();
    const [hist] = await sql<{ action: string }[]>`
      SELECT action FROM history WHERE demand_id = ${demandaId} AND action = 'recebimento_confirmado'`;
    expect(hist?.action).toBe('recebimento_confirmado');
  });

  it('falha se o usuário não é o influencer da demanda', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    const { id: outroId } = await criarUsuario({ perfil: 'Influencer' });
    const demandaId = await criarDemanda(influId, 'Aprovação');
    const outro = sessao(outroId);

    const res = await executarAcao(defConfirmarRecebimento, { demandaId }, deps(outro));

    expect(res.ok).toBe(false);
    expect(res.mensagem).toMatch(/influencer/i);
  });

  it('falha para demanda inexistente', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    const influencer = sessao(influId);

    const res = await executarAcao(defConfirmarRecebimento, { demandaId: 'LFXXXXXXX' }, deps(influencer));

    expect(res.ok).toBe(false);
    expect(res.mensagem).toMatch(/não encontrada/i);
  });
});

// ---------------------------------------------------------------------------
// adiarEntrega
// ---------------------------------------------------------------------------

describe('adiarEntrega', () => {
  it('atualiza post_date e registra histórico de adiamento', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    const demandaId = await criarDemanda(influId, 'Aprovação');
    const influencer = sessao(influId);
    const novaData = '2099-12-01';
    const motivo = 'Agenda cheia na semana';

    const res = await executarAcao(defAdiarEntrega, { demandaId, novaData, motivo }, deps(influencer));

    expect(res.ok).toBe(true);

    const sql = sqlTeste();
    const [dem] = await sql<{ post_date: Date }[]>`SELECT post_date FROM demands WHERE id = ${demandaId}`;
    expect(dem?.post_date.toISOString().slice(0, 10)).toBe(novaData);

    const [hist] = await sql<{ action: string; details: string }[]>`
      SELECT action, details FROM history WHERE demand_id = ${demandaId} AND action = 'adiamento'`;
    expect(hist?.action).toBe('adiamento');
    expect(hist?.details).toContain(novaData);
    expect(hist?.details).toContain(motivo);
  });

  it('não muda o status da demanda ao adiar', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    const demandaId = await criarDemanda(influId, 'Aprovação');
    const influencer = sessao(influId);

    await executarAcao(defAdiarEntrega, { demandaId, novaData: '2099-11-01', motivo: 'Teste' }, deps(influencer));

    const sql = sqlTeste();
    const [dem] = await sql<{ status: string }[]>`SELECT status FROM demands WHERE id = ${demandaId}`;
    expect(dem?.status).toBe('Aprovação');
  });

  it('falha se o usuário não é o influencer da demanda', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    const { id: outroId } = await criarUsuario({ perfil: 'Influencer' });
    const demandaId = await criarDemanda(influId, 'Aprovação');
    const outro = sessao(outroId);

    const res = await executarAcao(defAdiarEntrega, { demandaId, novaData: '2099-10-01', motivo: 'Teste' }, deps(outro));

    expect(res.ok).toBe(false);
    expect(res.mensagem).toMatch(/influencer/i);
  });

  it('falha para data no passado', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    const demandaId = await criarDemanda(influId, 'Aprovação');
    const influencer = sessao(influId);

    const res = await executarAcao(
      defAdiarEntrega,
      { demandaId, novaData: '2020-01-01', motivo: 'Data passada' },
      deps(influencer),
    );

    expect(res.ok).toBe(false);
    expect(res.mensagem).toMatch(/futura/i);
  });

  it('falha sem motivo', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    const demandaId = await criarDemanda(influId, 'Aprovação');
    const influencer = sessao(influId);

    const res = await executarAcao(
      defAdiarEntrega,
      { demandaId, novaData: '2099-10-01', motivo: '' },
      deps(influencer),
    );

    expect(res.ok).toBe(false);
    expect(res.mensagem).toMatch(/motivo/i);
  });
});

// ---------------------------------------------------------------------------
// listarAdiamentos
// ---------------------------------------------------------------------------

describe('listarAdiamentos', () => {
  it('retorna adiamentos registrados no histórico', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    const demandaId = await criarDemanda(influId, 'Aprovação');
    const influencer = sessao(influId);

    await executarAcao(defAdiarEntrega, { demandaId, novaData: '2099-09-01', motivo: 'Motivo A' }, deps(influencer));
    await executarAcao(defAdiarEntrega, { demandaId, novaData: '2099-10-01', motivo: 'Motivo B' }, deps(influencer));

    const adiamentos = await listarAdiamentos(demandaId);
    expect(adiamentos).toHaveLength(2);
    expect(adiamentos[0]?.detalhes).toContain('Motivo A');
    expect(adiamentos[1]?.detalhes).toContain('Motivo B');
  });

  it('retorna lista vazia para demanda sem adiamentos', async () => {
    const { id: influId } = await criarUsuario({ perfil: 'Influencer' });
    const demandaId = await criarDemanda(influId, 'Aprovação');

    const adiamentos = await listarAdiamentos(demandaId);
    expect(adiamentos).toHaveLength(0);
  });
});
