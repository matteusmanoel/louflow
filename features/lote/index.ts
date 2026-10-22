import 'server-only';
import { emTransacao, type Tx } from '@/lib/db';
import { registrarAuditoria } from '@/lib/audit';
import { transicionarStatus, type DemandaStatus } from '@/features/status/index';

// ---------------------------------------------------------------------------
// Máquina de desligamento — S1-15
// ---------------------------------------------------------------------------

/**
 * Statuses em que a Demanda pode ser cancelada sem perda de trabalho aprovado.
 * Inclui 'Ajustes solicitados' pois o editor/influencer ainda está produzindo.
 */
const STATUS_CANCELAR: readonly DemandaStatus[] = [
  'Não iniciada',
  'Em execução',
  'Pausada',
  'Ajustes solicitados',
] as const;

/**
 * Statuses em que a Demanda já foi submetida para aprovação.
 * Preservamos a Demanda mas removemos a atribuição do usuário desligado.
 */
const STATUS_REMOVER_ATRIBUICAO: readonly DemandaStatus[] = ['Aprovação'] as const;

type DemandaAberta = {
  id: string;
  status: DemandaStatus;
  editor_id: string | null;
  influencer_id: string | null;
};

/**
 * [S1-15] Executa o desligamento de um Usuário dentro de uma transação aberta pelo chamador (S1-01).
 *
 * Ordem das operações:
 * 1. Garante is_active = false (idempotente).
 * 2. Demandas em edição → Cancelada via máquina de Status.
 * 3. Demandas em aprovação → remove atribuição (editor_id / influencer_id).
 * 4. Captações futuras Agendadas → Cancelada.
 * 5. Reservas de Mídia Móvel futuras → Cancelada.
 * 6. Registra auditoria de desligamento.
 */
export async function desligarUsuario(
  tx: Tx,
  usuarioId: string,
  operadorId: string,
): Promise<void> {
  // 1. Inativa o usuário (idempotente — S1-01 pode já ter feito isso).
  await tx`
    UPDATE users
       SET is_active = false,
           updated_at = now()
     WHERE id = ${usuarioId}
       AND is_active = true`;

  // 2. Busca todas as Demandas abertas com este usuário como editor ou influencer.
  const demandas = await tx<DemandaAberta[]>`
    SELECT id, status, editor_id, influencer_id
      FROM demands
     WHERE (editor_id = ${usuarioId} OR influencer_id = ${usuarioId})
       AND status NOT IN ('Concluída', 'Reprovada', 'Cancelada')
       AND deleted_at IS NULL
     FOR UPDATE`;

  for (const demanda of demandas) {
    const st = demanda.status as DemandaStatus;

    if ((STATUS_CANCELAR as readonly string[]).includes(st)) {
      // Cancela via máquina de Status (registra histórico internamente).
      await transicionarStatus(tx, {
        demandaId: demanda.id,
        novoStatus: 'Cancelada',
        usuarioId: operadorId,
        motivo: 'Desligamento do usuário responsável.',
      });
    } else if ((STATUS_REMOVER_ATRIBUICAO as readonly string[]).includes(st)) {
      // Remove a atribuição sem cancelar: a Demanda continua em aprovação.
      const removerEditor =
        demanda.editor_id === usuarioId ? tx`editor_id = NULL` : tx``;
      const removerInfluencer =
        demanda.influencer_id === usuarioId ? tx`influencer_id = NULL` : tx``;

      if (demanda.editor_id === usuarioId && demanda.influencer_id === usuarioId) {
        await tx`
          UPDATE demands
             SET editor_id    = NULL,
                 influencer_id = NULL,
                 updated_at   = now()
           WHERE id = ${demanda.id}`;
      } else if (demanda.editor_id === usuarioId) {
        void removerInfluencer;
        await tx`
          UPDATE demands
             SET editor_id  = NULL,
                 updated_at = now()
           WHERE id = ${demanda.id}`;
      } else {
        void removerEditor;
        await tx`
          UPDATE demands
             SET influencer_id = NULL,
                 updated_at    = now()
           WHERE id = ${demanda.id}`;
      }
    }
  }

  // 3. Cancela Captações futuras Agendadas do videomaker.
  await tx`
    UPDATE captures
       SET status = 'Cancelada'
     WHERE videomaker_id = ${usuarioId}
       AND status        = 'Agendada'
       AND starts_at     > now()`;

  // 4. Cancela Reservas de Mídia Móvel futuras.
  await tx`
    UPDATE media_reservations
       SET status       = 'Cancelada',
           cancelled_at = now()
     WHERE reserved_by = ${usuarioId}
       AND status       = 'Reservada'
       AND starts_at    > now()`;

  // 5. Auditoria administrativa de desligamento.
  await registrarAuditoria(tx, {
    acao: 'desligamento',
    usuarioId: operadorId,
    alvo: usuarioId,
    detalhes: JSON.stringify({ motivo: 'desligamento' }),
  });
}

// ---------------------------------------------------------------------------
// Processamento em lote — S1-15
// ---------------------------------------------------------------------------

/**
 * Processa o desligamento de múltiplos usuários.
 * Cada usuário é tratado em transação própria; erros são coletados sem abortar o lote.
 * A verificação de permissão (gerenciarUsuarios) é responsabilidade do chamador.
 */
export async function processarLoteDesligamento(
  usuarioIds: string[],
  operadorId: string,
): Promise<{ processados: number; erros: string[] }> {
  let processados = 0;
  const erros: string[] = [];

  for (const usuarioId of usuarioIds) {
    try {
      await emTransacao((tx) => desligarUsuario(tx, usuarioId, operadorId));
      processados += 1;
    } catch (err) {
      const mensagem =
        err instanceof Error ? err.message : 'Erro desconhecido';
      erros.push(`${usuarioId}: ${mensagem}`);
    }
  }

  return { processados, erros };
}
