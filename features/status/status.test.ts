import { describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import type { Permissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { TRANSICOES, transicionarStatus, type DemandaStatus } from './index';
import { defAlterarStatus } from './acoes-def';

usarBancoLimpo();

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
  notaInformativaRanking: false,
};

function sessao(id: string, perm: Partial<Permissoes> = {}): UsuarioSessao {
  return {
    id,
    nome: 'Teste',
    perfil: 'Editor',
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: { ...PERMISSOES_VAZIAS, ...perm },
    ehAprovadorDelegado: false,
  };
}

function deps(usuario: UsuarioSessao) {
  return { obterUsuario: async () => usuario, sql: () => sqlTeste() };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let demandaCounter = 0;
async function criarDemanda(
  status: DemandaStatus = 'Não iniciada',
  editorId?: string,
): Promise<string> {
  demandaCounter += 1;
  const id = `LF${String(demandaCounter).padStart(10, '0')}`;
  const sql = sqlTeste();
  await sql`
    INSERT INTO demands (id, title, format, status, priority)
    VALUES (${id}, ${'Demanda Teste'}, ${'Vídeo'}, ${status}, ${'Normal'})`;
  if (editorId) {
    await sql`UPDATE demands SET editor_id = ${editorId} WHERE id = ${id}`;
  }
  return id;
}

// ---------------------------------------------------------------------------
// TRANSICOES — mapa estático
// ---------------------------------------------------------------------------

describe('TRANSICOES', () => {
  it('define transições válidas a partir de cada status', () => {
    // Estados terminais não têm transições
    expect(TRANSICOES['Concluída']).toHaveLength(0);
    expect(TRANSICOES['Cancelada']).toHaveLength(0);
    expect(TRANSICOES['Reprovada']).toHaveLength(0);

    // Fluxo principal
    expect(TRANSICOES['Não iniciada']).toContain('Em execução');
    expect(TRANSICOES['Em execução']).toContain('Aprovação');
    expect(TRANSICOES['Em execução']).toContain('Pausada');
    expect(TRANSICOES['Pausada']).toContain('Em execução');
    expect(TRANSICOES['Aprovação']).toContain('Concluída');
    expect(TRANSICOES['Aprovação']).toContain('Ajustes solicitados');
    expect(TRANSICOES['Ajustes solicitados']).toContain('Em execução');
  });

  it('permite cancelar a partir de qualquer estado não-terminal', () => {
    const naoTerminais: DemandaStatus[] = [
      'Não iniciada', 'Em execução', 'Pausada', 'Aprovação', 'Ajustes solicitados',
    ];
    for (const s of naoTerminais) {
      expect(TRANSICOES[s]).toContain('Cancelada');
    }
  });
});

// ---------------------------------------------------------------------------
// transicionarStatus — função protegida
// ---------------------------------------------------------------------------

describe('transicionarStatus', () => {
  it('realiza transição válida e registra histórico', async () => {
    const { id: userId } = await criarUsuario();
    const demandaId = await criarDemanda('Não iniciada');
    const sql = sqlTeste();

    await sql.begin(async (tx) => {
      await transicionarStatus(tx, {
        demandaId,
        novoStatus: 'Em execução',
        usuarioId: userId,
        motivo: 'Iniciando edição',
      });
    });

    const [dem] = await sql<{ status: string }[]>`SELECT status FROM demands WHERE id = ${demandaId}`;
    expect(dem?.status).toBe('Em execução');

    const hist = await sql<{ action: string }[]>`SELECT action FROM history WHERE demand_id = ${demandaId}`;
    expect(hist.some((h) => h.action === 'status:Em execução')).toBe(true);
  });

  it('rejeita transição inválida com ErroDominio', async () => {
    const { id: userId } = await criarUsuario();
    const demandaId = await criarDemanda('Não iniciada');
    const sql = sqlTeste();

    await expect(
      sql.begin(async (tx) => {
        await transicionarStatus(tx, {
          demandaId,
          novoStatus: 'Concluída', // inválido: 'Não iniciada' → 'Concluída' não existe
          usuarioId: userId,
        });
      }),
    ).rejects.toThrow('Transição inválida');
  });

  it('rejeita demanda inexistente', async () => {
    const { id: userId } = await criarUsuario();
    const sql = sqlTeste();

    await expect(
      sql.begin(async (tx) => {
        await transicionarStatus(tx, {
          demandaId: 'LF9999999999',
          novoStatus: 'Em execução',
          usuarioId: userId,
        });
      }),
    ).rejects.toThrow('Demanda não encontrada');
  });

  it('cancela a partir de Em execução', async () => {
    const { id: userId } = await criarUsuario();
    const demandaId = await criarDemanda('Em execução');
    const sql = sqlTeste();

    await sql.begin(async (tx) => {
      await transicionarStatus(tx, { demandaId, novoStatus: 'Cancelada', usuarioId: userId });
    });

    const [dem] = await sql<{ status: string }[]>`SELECT status FROM demands WHERE id = ${demandaId}`;
    expect(dem?.status).toBe('Cancelada');
  });

  it('pausa e retoma', async () => {
    const { id: userId } = await criarUsuario();
    const demandaId = await criarDemanda('Em execução');
    const sql = sqlTeste();

    await sql.begin(async (tx) => {
      await transicionarStatus(tx, { demandaId, novoStatus: 'Pausada', usuarioId: userId });
    });
    await sql.begin(async (tx) => {
      await transicionarStatus(tx, { demandaId, novoStatus: 'Em execução', usuarioId: userId });
    });

    const [dem] = await sql<{ status: string }[]>`SELECT status FROM demands WHERE id = ${demandaId}`;
    expect(dem?.status).toBe('Em execução');
  });

  it('abre ciclo ao entrar em Em execução e grava active_ms ao sair', async () => {
    const { id: userId } = await criarUsuario();
    const demandaId = await criarDemanda('Não iniciada', userId);
    const sql = sqlTeste();

    await sql.begin(async (tx) => {
      await transicionarStatus(tx, { demandaId, novoStatus: 'Em execução', usuarioId: userId });
    });

    await sql`
      UPDATE editing_cycles
         SET started_at = now() - interval '10 minutes'
       WHERE demand_id = ${demandaId} AND ended_at IS NULL`;

    await sql.begin(async (tx) => {
      await transicionarStatus(tx, { demandaId, novoStatus: 'Pausada', usuarioId: userId });
    });
    await sql`
      UPDATE demand_pauses
         SET paused_at = now() - interval '4 minutes'
       WHERE demand_id = ${demandaId} AND resumed_at IS NULL`;

    await sql.begin(async (tx) => {
      await transicionarStatus(tx, { demandaId, novoStatus: 'Em execução', usuarioId: userId });
    });
    await sql.begin(async (tx) => {
      await transicionarStatus(tx, { demandaId, novoStatus: 'Aprovação', usuarioId: userId });
    });

    const [ciclo] = await sql<{
      status: string;
      active_ms: string;
      paused_ms: string;
      ended_at: Date | null;
    }[]>`
      SELECT status, active_ms::text, paused_ms::text, ended_at
        FROM editing_cycles
       WHERE demand_id = ${demandaId}`;

    expect(ciclo?.status).toBe('Concluído');
    expect(ciclo?.ended_at).not.toBeNull();
    const ativo = Number(ciclo?.active_ms);
    const pausado = Number(ciclo?.paused_ms);
    expect(pausado).toBeGreaterThan(3 * 60 * 1000);
    expect(pausado).toBeLessThan(5 * 60 * 1000);
    expect(ativo).toBeGreaterThan(5 * 60 * 1000);
    expect(ativo).toBeLessThan(7 * 60 * 1000);
  });

  it('interrompe o ciclo ao cancelar e não abre outro', async () => {
    const { id: userId } = await criarUsuario();
    const demandaId = await criarDemanda('Não iniciada', userId);
    const sql = sqlTeste();

    await sql.begin(async (tx) => {
      await transicionarStatus(tx, { demandaId, novoStatus: 'Em execução', usuarioId: userId });
    });
    await sql.begin(async (tx) => {
      await transicionarStatus(tx, {
        demandaId,
        novoStatus: 'Cancelada',
        usuarioId: userId,
        motivo: 'Encerrado no teste',
      });
    });

    const ciclos = await sql<{ status: string; ended_at: Date | null }[]>`
      SELECT status, ended_at FROM editing_cycles WHERE demand_id = ${demandaId}`;
    expect(ciclos).toHaveLength(1);
    expect(ciclos[0]?.status).toBe('Interrompido');
    expect(ciclos[0]?.ended_at).not.toBeNull();
  });

  it('define completed_at ao transicionar para Concluída', async () => {
    const { id: userId } = await criarUsuario();
    const demandaId = await criarDemanda('Aprovação');
    const sql = sqlTeste();

    await sql.begin(async (tx) => {
      await transicionarStatus(tx, { demandaId, novoStatus: 'Concluída', usuarioId: userId });
    });

    const [dem] = await sql<{ completed_at: Date | null }[]>`
      SELECT completed_at FROM demands WHERE id = ${demandaId}`;
    expect(dem?.completed_at).not.toBeNull();
  });
});

describe('alterarStatusDemanda', () => {
  it('realiza transição válida pela ação', async () => {
    const { id: userId } = await criarUsuario();
    const demandaId = await criarDemanda('Não iniciada');

    const res = await executarAcao(
      defAlterarStatus,
      { demandaId, novoStatus: 'Em execução' },
      deps(sessao(userId, { alterarStatus: true })),
    );

    expect(res.ok).toBe(true);
    const [dem] = await sqlTeste()<{ status: string }[]>`SELECT status FROM demands WHERE id = ${demandaId}`;
    expect(dem?.status).toBe('Em execução');
  });

  it('rejeita transição inválida', async () => {
    const { id: userId } = await criarUsuario();
    const demandaId = await criarDemanda('Não iniciada');

    const res = await executarAcao(
      defAlterarStatus,
      { demandaId, novoStatus: 'Concluída' },
      deps(sessao(userId, { alterarStatus: true })),
    );

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.mensagem).toMatch(/Transição inválida/);
  });

  it('nega quem não tem permissão', async () => {
    const { id: userId } = await criarUsuario();
    const demandaId = await criarDemanda('Não iniciada');

    const res = await executarAcao(
      defAlterarStatus,
      { demandaId, novoStatus: 'Em execução' },
      deps(sessao(userId)),
    );

    expect(res).toEqual({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
  });

  it('exige motivo para cancelar', async () => {
    const { id: userId } = await criarUsuario();
    const demandaId = await criarDemanda('Em execução');

    const res = await executarAcao(
      defAlterarStatus,
      { demandaId, novoStatus: 'Cancelada' },
      deps(sessao(userId, { alterarStatus: true })),
    );

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.mensagem).toMatch(/motivo/);
  });
});
