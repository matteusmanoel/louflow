import 'server-only';
import type { DefinicaoAcao } from '@/lib/action';
import { novoId } from '@/lib/crypto';
import type { Tx } from '@/lib/db';
import { ErroDominio } from '@/lib/errors';
import type { UsuarioSessao } from '@/lib/session';
import { transicionarStatus } from '@/features/status/index';
import { gravarArquivosDemanda } from '@/features/arquivos/gravar';
import { textoAjuste, textoAprovacao } from '@/features/notificacoes/mensagens';
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

    await gravarArquivosDemanda(tx, {
      demandaId: entrada.demandaId,
      entregaId,
      usuarioId: usuario.id,
      arquivos: entrada.arquivos ?? [],
    });

    await transicionarStatus(tx, {
      demandaId: entrada.demandaId,
      novoStatus: 'Aprovação',
      usuarioId: usuario.id,
      motivo: `Entrega v${versao} registrada.`,
    });

    return { dados: { entregaId }, mensagem: 'Entrega registrada. Aguardando aprovação.' };
  },
};

const podeEntrarAvaliacao = (usuario: UsuarioSessao) =>
  usuario.perfil === 'Administrador' ||
  usuario.perfil === 'Influencer' ||
  usuario.ehAprovadorDelegado ||
  usuario.permissoes.verTodasDemandas;

async function podeAvaliar(
  tx: Tx,
  usuario: UsuarioSessao,
  demanda: { influencer_id: string | null; editor_id: string | null },
) {
  if (usuario.perfil === 'Administrador' || usuario.permissoes.verTodasDemandas) return true;
  if (demanda.influencer_id === usuario.id) return true;
  if (!demanda.editor_id) return false;
  const [delegacao] = await tx<{ ok: number }[]>`
    SELECT 1 AS ok FROM approval_delegations
    WHERE approver_id = ${usuario.id} AND editor_id = ${demanda.editor_id}`;
  return Boolean(delegacao);
}

async function entregaEmAvaliacao(tx: Tx, usuario: UsuarioSessao, entregaId: string) {
  const [entrega] = await tx<{ demand_id: string; status: string; version: number }[]>`
    SELECT demand_id, status, version FROM deliveries WHERE id = ${entregaId} FOR UPDATE`;
  if (!entrega) throw new ErroDominio('Entrega não encontrada.');
  if (entrega.status !== 'Aguardando aprovação') {
    throw new ErroDominio(`Entrega não está aguardando aprovação (status: ${entrega.status}).`);
  }
  const [demanda] = await tx<{ title: string; influencer_id: string | null; editor_id: string | null }[]>`
    SELECT title, influencer_id, editor_id FROM demands WHERE id = ${entrega.demand_id} FOR UPDATE`;
  if (!demanda || !(await podeAvaliar(tx, usuario, demanda))) {
    throw new ErroDominio('Você não avalia esta entrega.');
  }
  return { entrega, demanda };
}

export const defAprovarEntrega: DefinicaoAcao<
  typeof schemaAprovarEntrega,
  { demandaId: string; titulo: string }
> = {
  nome: 'aprovarEntrega',
  schema: schemaAprovarEntrega,
  permissao: podeEntrarAvaliacao,
  executar: async ({ tx, usuario, entrada, notificar }) => {
    const { entrega, demanda } = await entregaEmAvaliacao(tx, usuario, entrada.entregaId);

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

    if (demanda.influencer_id) {
      await tx`
        INSERT INTO mandatory_schedules (id, demand_id, influencer_id, title, version, status)
        VALUES (
          ${novoId('AO')}, ${entrega.demand_id}, ${demanda.influencer_id},
          ${demanda.title}, ${entrega.version}, 'Pendente'
        )
        ON CONFLICT (demand_id) WHERE status = 'Pendente' DO NOTHING`;
    }

    notificar({
      tipo: 'concluida_aprovada',
      destinatarios: demanda.influencer_id ? [demanda.influencer_id] : [],
      assunto: `Demanda aprovada: ${demanda.title}`,
      texto: textoAprovacao(demanda.title, demanda.influencer_id),
      demandaId: entrega.demand_id,
    });

    return {
      dados: { demandaId: entrega.demand_id, titulo: demanda.title },
      mensagem: 'Entrega aprovada. Demanda concluída.',
    };
  },
};

export const defReprovarEntrega: DefinicaoAcao<typeof schemaReprovarEntrega, null> = {
  nome: 'reprovarEntrega',
  schema: schemaReprovarEntrega,
  permissao: podeEntrarAvaliacao,
  executar: async ({ tx, usuario, entrada, notificar }) => {
    const { entrega, demanda } = await entregaEmAvaliacao(tx, usuario, entrada.entregaId);
    if (usuario.perfil === 'Administrador') {
      throw new ErroDominio('Quem administra aprova a entrega. O pedido de ajuste fica com o influencer.');
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
      novoStatus: 'Ajustes solicitados',
      usuarioId: usuario.id,
      motivo: entrada.motivoRejeicao,
    });

    notificar({
      tipo: 'ajuste_solicitado',
      destinatarios: demanda.editor_id ? [demanda.editor_id] : [],
      assunto: `Ajuste solicitado: ${demanda.title}`,
      texto: textoAjuste(demanda.title, demanda.editor_id, entrada.motivoRejeicao),
      demandaId: entrega.demand_id,
    });

    return { dados: null, mensagem: 'Ajuste solicitado.' };
  },
};
