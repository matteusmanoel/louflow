import 'server-only';
import type { Tx } from '@/lib/db';
import { novoId } from '@/lib/crypto';
import { ErroDominio } from '@/lib/errors';
import { registrarHistorico } from '@/lib/history';
import type { DemandaStatus } from '@/features/demandas/consultas';
import { TRANSICOES } from './transicoes';

export type { DemandaStatus };
export { TRANSICOES };

// ---------------------------------------------------------------------------
// Máquina de Estado — S1-10
// Única zona que executa UPDATE demands SET status = ...
// ---------------------------------------------------------------------------

export type EntradaTransicao = {
  demandaId: string;
  novoStatus: DemandaStatus;
  usuarioId: string;
  /** Motivo facultativo, obrigatório em cancelamentos e rejeições. */
  motivo?: string;
};

/**
 * [ZONA PROTEGIDA] Única função que executa UPDATE demands SET status.
 * Abre SELECT FOR UPDATE, valida a transição, persiste e registra no histórico.
 * Deve ser chamada dentro de uma transação aberta pelo chamador.
 */
export async function transicionarStatus(
  tx: Tx,
  entrada: EntradaTransicao,
): Promise<void> {
  const { demandaId, novoStatus, usuarioId, motivo } = entrada;

  // SELECT FOR UPDATE garante serialização de escritas concorrentes na mesma Demanda.
  const [demanda] = await tx<{ status: DemandaStatus; editor_id: string | null }[]>`
    SELECT status, editor_id FROM demands WHERE id = ${demandaId} FOR UPDATE`;

  if (!demanda) {
    throw new ErroDominio('Demanda não encontrada.');
  }

  const permitidos = TRANSICOES[demanda.status];
  if (!permitidos.includes(novoStatus)) {
    throw new ErroDominio(
      `Transição inválida: ${demanda.status} → ${novoStatus}.`,
    );
  }

  await tx`
    UPDATE demands
       SET status     = ${novoStatus},
           updated_at = now()
           ${novoStatus === 'Concluída' ? tx`, completed_at = now()` : tx``}
     WHERE id = ${demandaId}`;

  await aplicarCiclo(tx, {
    demandaId,
    anterior: demanda.status,
    novoStatus,
    editorId: demanda.editor_id ?? usuarioId,
    usuarioId,
  });

  await registrarHistorico(tx, {
    demandaId,
    acao: `status:${novoStatus}`,
    usuarioId,
    detalhes: motivo,
  });
}

function emTrabalho(status: DemandaStatus): boolean {
  return status === 'Em execução' || status === 'Pausada';
}

/**
 * Efeitos do relógio na mesma transação da mudança de Status (PRD §4.4).
 * Sem ciclo aberto, fechar é no-op: demandas já estavam Em execução antes desta regra.
 */
async function aplicarCiclo(
  tx: Tx,
  entrada: {
    demandaId: string;
    anterior: DemandaStatus;
    novoStatus: DemandaStatus;
    editorId: string;
    usuarioId: string;
  },
): Promise<void> {
  const { demandaId, anterior, novoStatus, editorId, usuarioId } = entrada;

  if (emTrabalho(anterior) && !emTrabalho(novoStatus)) {
    await fecharCiclo(tx, demandaId, novoStatus);
  } else if (anterior === 'Pausada' && novoStatus === 'Em execução') {
    await fecharPausaAberta(tx, demandaId);
  } else if (anterior === 'Em execução' && novoStatus === 'Pausada') {
    await abrirPausa(tx, demandaId, usuarioId);
  }

  if (novoStatus === 'Em execução' && !emTrabalho(anterior)) {
    await abrirCiclo(tx, demandaId, editorId);
  }
}

async function abrirCiclo(tx: Tx, demandaId: string, editorId: string): Promise<void> {
  const [row] = await tx<{ versao: number }[]>`
    SELECT COALESCE(MAX(version), 0)::int AS versao
      FROM editing_cycles
     WHERE demand_id = ${demandaId}`;
  await tx`
    INSERT INTO editing_cycles (id, demand_id, version, editor_id, started_at, status)
    VALUES (${novoId('CY')}, ${demandaId}, ${(row?.versao ?? 0) + 1}, ${editorId}, now(), 'Em andamento')`;
}

async function abrirPausa(tx: Tx, demandaId: string, usuarioId: string): Promise<void> {
  await tx`
    INSERT INTO demand_pauses (id, demand_id, paused_at, user_id)
    VALUES (${novoId('PA')}, ${demandaId}, now(), ${usuarioId})`;
}

async function fecharPausaAberta(tx: Tx, demandaId: string): Promise<void> {
  await tx`
    UPDATE demand_pauses
       SET resumed_at = now()
     WHERE demand_id = ${demandaId}
       AND resumed_at IS NULL`;
}

async function fecharCiclo(tx: Tx, demandaId: string, novoStatus: DemandaStatus): Promise<void> {
  const [ciclo] = await tx<{ id: string }[]>`
    SELECT id
      FROM editing_cycles
     WHERE demand_id = ${demandaId}
       AND ended_at IS NULL
     FOR UPDATE`;
  if (!ciclo) return;

  await fecharPausaAberta(tx, demandaId);

  const situacao = novoStatus === 'Cancelada' || novoStatus === 'Reprovada' ? 'Interrompido' : 'Concluído';

  await tx`
    UPDATE editing_cycles c
       SET ended_at = now(),
           status = ${situacao},
           paused_ms = s.pausado,
           active_ms = GREATEST(
             0,
             (EXTRACT(EPOCH FROM (now() - c.started_at)) * 1000)::bigint - s.pausado
           )
      FROM (
        SELECT COALESCE(SUM((EXTRACT(EPOCH FROM (p.resumed_at - p.paused_at)) * 1000)::bigint), 0)::bigint AS pausado
          FROM editing_cycles ec
          LEFT JOIN demand_pauses p
            ON p.demand_id = ec.demand_id
           AND p.paused_at >= ec.started_at
           AND p.resumed_at IS NOT NULL
         WHERE ec.id = ${ciclo.id}
      ) s
     WHERE c.id = ${ciclo.id}`;
}

// Re-export do componente para uso via features/demandas/secoes.ts
export { StatusControle } from './components/StatusControle';
