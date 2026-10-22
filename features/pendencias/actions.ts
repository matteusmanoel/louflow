'use server';

import { criarAcao, type DefinicaoAcao } from '@/lib/action';
import { ErroDominio } from '@/lib/errors';
import { registrarHistorico } from '@/lib/history';
import { schemaConfirmarRecebimento, schemaAdiarEntrega } from './schema';

// ---------------------------------------------------------------------------
// Definições exportadas para uso em testes via executarAcao
// ---------------------------------------------------------------------------

export const defConfirmarRecebimento: DefinicaoAcao<typeof schemaConfirmarRecebimento, null> = {
  nome: 'confirmarRecebimento',
  schema: schemaConfirmarRecebimento,
  executar: async ({ tx, usuario, entrada }) => {
    const [demanda] = await tx<{ influencer_id: string | null; deleted_at: Date | null }[]>`
      SELECT influencer_id, deleted_at
      FROM demands
      WHERE id = ${entrada.demandaId}
      LIMIT 1`;

    if (!demanda) throw new ErroDominio('Demanda não encontrada.');
    if (demanda.deleted_at != null) throw new ErroDominio('Demanda excluída.');
    if (demanda.influencer_id !== usuario.id) {
      throw new ErroDominio('Você não é o influencer desta Demanda.');
    }

    await registrarHistorico(tx, {
      demandaId: entrada.demandaId,
      acao: 'recebimento_confirmado',
      usuarioId: usuario.id,
      detalhes: 'Influencer confirmou recebimento do brief.',
    });

    return { dados: null, mensagem: 'Recebimento confirmado.' };
  },
};

export const defAdiarEntrega: DefinicaoAcao<typeof schemaAdiarEntrega, null> = {
  nome: 'adiarEntrega',
  schema: schemaAdiarEntrega,
  executar: async ({ tx, usuario, entrada }) => {
    const [demanda] = await tx<{
      influencer_id: string | null;
      deleted_at: Date | null;
      post_date: string | null;
    }[]>`
      SELECT influencer_id, deleted_at, post_date
      FROM demands
      WHERE id = ${entrada.demandaId}
      FOR UPDATE`;

    if (!demanda) throw new ErroDominio('Demanda não encontrada.');
    if (demanda.deleted_at != null) throw new ErroDominio('Demanda excluída.');
    if (demanda.influencer_id !== usuario.id) {
      throw new ErroDominio('Você não é o influencer desta Demanda.');
    }

    await tx`
      UPDATE demands
         SET post_date  = ${entrada.novaData},
             updated_at = now()
       WHERE id = ${entrada.demandaId}`;

    await registrarHistorico(tx, {
      demandaId: entrada.demandaId,
      acao: 'adiamento',
      usuarioId: usuario.id,
      detalhes: `Data adiada para ${entrada.novaData}. Motivo: ${entrada.motivo}`,
    });

    return { dados: null, mensagem: 'Entrega adiada com sucesso.' };
  },
};

// ---------------------------------------------------------------------------
// Server Actions (chamadas de Client Components / forms)
// ---------------------------------------------------------------------------

export const confirmarRecebimento = criarAcao(defConfirmarRecebimento);
export const adiarEntrega = criarAcao(defAdiarEntrega);
