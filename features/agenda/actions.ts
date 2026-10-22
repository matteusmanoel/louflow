'use server';

import { criarAcao, type DefinicaoAcao } from '@/lib/action';
import { ErroDominio } from '@/lib/errors';
import { registrarHistorico } from '@/lib/history';
import { schemaAgendarPostagem, schemaCancelarAgendamento } from './schema';

// ---- Tipos internos ----

type DemandaLinhaLock = {
  id: string;
  status: string;
  post_date: string | null;
};

// ---- Definições exportadas para uso nos testes ----

export const defAgendarPostagem: DefinicaoAcao<typeof schemaAgendarPostagem, { demandaId: string }> = {
  nome: 'agendarPostagem',
  schema: schemaAgendarPostagem,
  permissao: 'editarDemandas',
  executar: async ({ tx, usuario, entrada }) => {
    const [demanda] = await tx<DemandaLinhaLock[]>`
      SELECT id, status, post_date FROM demands
      WHERE id = ${entrada.demandaId} AND deleted_at IS NULL
      FOR UPDATE`;

    if (!demanda) throw new ErroDominio('Demanda não encontrada.');
    if (demanda.status === 'Cancelada') throw new ErroDominio('Não é possível agendar uma demanda Cancelada.');
    if (demanda.status === 'Concluída') throw new ErroDominio('Não é possível agendar uma demanda Concluída.');

    await tx`
      UPDATE demands
      SET post_date = ${entrada.postDate}::date, updated_at = now()
      WHERE id = ${entrada.demandaId}`;

    await registrarHistorico(tx, {
      demandaId: entrada.demandaId,
      acao: 'postagem_agendada',
      usuarioId: usuario.id,
      detalhes: `Data de postagem definida para ${entrada.postDate}.`,
    });

    return { dados: { demandaId: entrada.demandaId }, mensagem: 'Postagem agendada.' };
  },
};

export const defCancelarAgendamento: DefinicaoAcao<typeof schemaCancelarAgendamento, { demandaId: string }> = {
  nome: 'cancelarAgendamento',
  schema: schemaCancelarAgendamento,
  permissao: 'editarDemandas',
  executar: async ({ tx, usuario, entrada }) => {
    const [demanda] = await tx<DemandaLinhaLock[]>`
      SELECT id, status, post_date FROM demands
      WHERE id = ${entrada.demandaId} AND deleted_at IS NULL
      FOR UPDATE`;

    if (!demanda) throw new ErroDominio('Demanda não encontrada.');
    if (demanda.status === 'Cancelada') throw new ErroDominio('Não é possível alterar agendamento de uma demanda Cancelada.');
    if (demanda.status === 'Concluída') throw new ErroDominio('Não é possível alterar agendamento de uma demanda Concluída.');
    if (!demanda.post_date) throw new ErroDominio('Esta demanda não tem data de postagem agendada.');

    await tx`
      UPDATE demands
      SET post_date = NULL, updated_at = now()
      WHERE id = ${entrada.demandaId}`;

    await registrarHistorico(tx, {
      demandaId: entrada.demandaId,
      acao: 'agendamento_cancelado',
      usuarioId: usuario.id,
      detalhes: 'Data de postagem removida.',
    });

    return { dados: { demandaId: entrada.demandaId }, mensagem: 'Agendamento cancelado.' };
  },
};

// ---- Server Actions expostas ao cliente ----

export const agendarPostagem = criarAcao(defAgendarPostagem);
export const cancelarAgendamento = criarAcao(defCancelarAgendamento);
