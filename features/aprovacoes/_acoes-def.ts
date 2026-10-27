import 'server-only';
import type { DefinicaoAcao } from '@/lib/action';
import { ErroDominio } from '@/lib/errors';
import { transicionarStatus } from '@/features/status/index';
import {
  schemaRegistrarEntrega,
  schemaAprovarEntrega,
  schemaReprovarEntrega,
} from './schema';

export const defRegistrarEntrega: DefinicaoAcao<
  typeof schemaRegistrarEntrega,
  { entregaId: string }
> = {
  nome: 'registrarEntrega',
  schema: schemaRegistrarEntrega,
  permissao: 'editarDemandas',
  executar: async ({ tx, usuario, entrada }) => {
    const [demanda] = await tx<{ status: string; editor_id: string | null }[]>`
      SELECT status, editor_id FROM demands WHERE id = ${entrada.demandaId} LIMIT 1`;

    if (!demanda) throw new ErroDominio('Demanda não encontrada.');
    if (demanda.status !== 'Em execução') {
      throw new ErroDominio(
        `Só é possível registrar entrega em Demandas "Em execução" (atual: ${demanda.status}).`,
      );
    }

    const [ultima] = await tx<{ versao: number | null }[]>`
      SELECT max(version) AS versao FROM deliveries WHERE demand_id = ${entrada.demandaId}`;
    const versao = (ultima?.versao ?? 0) + 1;

    const entregaId = `ENT-${entrada.demandaId}-${versao}`;

    await tx`
      INSERT INTO deliveries (id, demand_id, version, link, note, editor_id, status)
      VALUES (
        ${entregaId},
        ${entrada.demandaId},
        ${versao},
        ${entrada.arquivoUrl},
        ${entrada.observacoes ?? null},
        ${demanda.editor_id ?? usuario.id},
        'Aguardando aprovação'
      )`;

    await transicionarStatus(tx, {
      demandaId: entrada.demandaId,
      novoStatus: 'Aprovação',
      usuarioId: usuario.id,
      motivo: `Entrega v${versao} registrada.`,
    });

    return { dados: { entregaId }, mensagem: 'Entrega registrada. Aguardando aprovação.' };
  },
};

export const defAprovarEntrega: DefinicaoAcao<typeof schemaAprovarEntrega, null> = {
  nome: 'aprovarEntrega',
  schema: schemaAprovarEntrega,
  permissao: 'verTodasDemandas',
  executar: async ({ tx, usuario, entrada }) => {
    const [entrega] = await tx<{ demand_id: string; status: string; version: number }[]>`
      SELECT demand_id, status, version FROM deliveries WHERE id = ${entrada.entregaId} FOR UPDATE`;

    if (!entrega) throw new ErroDominio('Entrega não encontrada.');
    if (entrega.status !== 'Aguardando aprovação') {
      throw new ErroDominio(`Entrega não está aguardando aprovação (status: ${entrega.status}).`);
    }

    await tx`
      UPDATE deliveries
         SET status       = 'Aprovada',
             evaluated_at = now(),
             evaluated_by = ${usuario.id},
             note         = COALESCE(${entrada.observacoes ?? null}, note)
       WHERE id = ${entrada.entregaId}`;

    await transicionarStatus(tx, {
      demandaId: entrega.demand_id,
      novoStatus: 'Concluída',
      usuarioId: usuario.id,
      motivo: entrada.observacoes,
    });

    return { dados: null, mensagem: 'Entrega aprovada. Demanda concluída.' };
  },
};

export const defReprovarEntrega: DefinicaoAcao<typeof schemaReprovarEntrega, null> = {
  nome: 'reprovarEntrega',
  schema: schemaReprovarEntrega,
  permissao: 'verTodasDemandas',
  executar: async ({ tx, usuario, entrada }) => {
    const [entrega] = await tx<{ demand_id: string; status: string; version: number }[]>`
      SELECT demand_id, status, version FROM deliveries WHERE id = ${entrada.entregaId} FOR UPDATE`;

    if (!entrega) throw new ErroDominio('Entrega não encontrada.');
    if (entrega.status !== 'Aguardando aprovação') {
      throw new ErroDominio(`Entrega não está aguardando aprovação (status: ${entrega.status}).`);
    }

    await tx`
      UPDATE deliveries
         SET status       = 'Ajustes solicitados',
             reason       = ${entrada.motivoRejeicao},
             evaluated_at = now(),
             evaluated_by = ${usuario.id}
       WHERE id = ${entrada.entregaId}`;

    await transicionarStatus(tx, {
      demandaId: entrega.demand_id,
      novoStatus: 'Em execução',
      usuarioId: usuario.id,
      motivo: entrada.motivoRejeicao,
    });

    return { dados: null, mensagem: 'Entrega reprovada. Demanda devolvida para edição.' };
  },
};
