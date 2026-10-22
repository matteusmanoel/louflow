import { describe, expect, it } from 'vitest';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { TRANSICOES, transicionarStatus, type DemandaStatus } from './index';

usarBancoLimpo();

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
