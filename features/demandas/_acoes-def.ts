import 'server-only';
import { novoId } from '@/lib/crypto';
import { ErroDominio } from '@/lib/errors';
import { registrarHistorico } from '@/lib/history';
import type { DefinicaoAcao } from '@/lib/action';
import {
  schemaAssumirFicha,
  schemaCriarDemanda,
  schemaEditarDemanda,
  schemaExcluirDemanda,
  type EntradaAssumirFicha,
  type EntradaCriarDemanda,
  type EntradaEditarDemanda,
  type EntradaExcluirDemanda,
} from './schema';
import type { Tx } from '@/lib/db';

const FORMATO_CORTES = 'Cortes';

export async function obterEditorPadraoCortes(tx: Tx): Promise<string | null> {
  const [linha] = await tx<{ user_id: string }[]>`
    SELECT user_id FROM user_permissions
    WHERE permission_key = 'editorPadraoCortes' AND granted
    LIMIT 1
  `;
  return linha?.user_id ?? null;
}

export const defCriarDemanda: DefinicaoAcao<typeof schemaCriarDemanda, { id: string }> = {
  nome: 'criarDemanda',
  schema: schemaCriarDemanda,
  permissao: 'criarDemandas',
  executar: async ({ tx, usuario, entrada, notificar }) => {
    const id = novoId('LF');
    let editorId: string | null = entrada.editor_id ?? null;

    if (entrada.format === FORMATO_CORTES) {
      const editorCortes = await obterEditorPadraoCortes(tx);
      if (!editorCortes) {
        throw new ErroDominio(
          'Nenhum Editor padrão de Cortes configurado. Configure o Editor de Cortes antes de criar demandas deste formato.',
        );
      }
      editorId = editorCortes;
    }

    if (
      editorId &&
      editorId !== usuario.id &&
      entrada.format !== FORMATO_CORTES &&
      !usuario.permissoes.definirOutroEditor
    ) {
      throw new ErroDominio('Você não tem permissão para definir outro Editor.');
    }

    await tx`
      INSERT INTO demands (
        id, title, format, influencer_id, editor_id, priority,
        approval_date, post_date, info, link, editorial_line,
        source_program, clips_count, created_by
      ) VALUES (
        ${id},
        ${entrada.title},
        ${entrada.format},
        ${entrada.influencer_id ?? null},
        ${editorId},
        ${entrada.priority},
        ${entrada.approval_date ?? null},
        ${entrada.post_date ?? null},
        ${entrada.info ?? null},
        ${entrada.link ?? null},
        ${entrada.editorial_line ?? null},
        ${entrada.source_program ?? null},
        ${entrada.clips_count ?? null},
        ${usuario.id}
      )
    `;

    await registrarHistorico(tx, {
      demandaId: id,
      acao: 'Demanda criada',
      usuarioId: usuario.id,
      detalhes: `Título: ${entrada.title} | Formato: ${entrada.format}`,
    });

    if (editorId && editorId !== usuario.id) {
      notificar({
        tipo: 'editor_atribuido',
        destinatarios: [editorId],
        assunto: `Nova demanda atribuída: ${entrada.title}`,
        texto: `A demanda "${entrada.title}" foi atribuída a você.`,
        demandaId: id,
      });
    }

    return { dados: { id }, mensagem: 'Demanda criada com sucesso.' };
  },
};

export const defEditarDemanda: DefinicaoAcao<typeof schemaEditarDemanda, { id: string }> = {
  nome: 'editarDemanda',
  schema: schemaEditarDemanda,
  permissao: 'editarDemandas',
  executar: async ({ tx, usuario, entrada }) => {
    const [demanda] = await tx<{ id: string; format: string; editor_id: string | null }[]>`
      SELECT id, format, editor_id FROM demands
      WHERE id = ${entrada.id} AND deleted_at IS NULL
      FOR UPDATE
    `;
    if (!demanda) throw new ErroDominio('Demanda não encontrada.');

    let editorId: string | null = entrada.editor_id ?? null;

    if (demanda.format === FORMATO_CORTES || entrada.format === FORMATO_CORTES) {
      if (entrada.format === FORMATO_CORTES && demanda.format !== FORMATO_CORTES) {
        const editorCortes = await obterEditorPadraoCortes(tx);
        if (!editorCortes) throw new ErroDominio('Nenhum Editor padrão de Cortes configurado.');
        editorId = editorCortes;
      } else if (demanda.format === FORMATO_CORTES) {
        editorId = demanda.editor_id;
      }
    }

    if (
      editorId &&
      editorId !== usuario.id &&
      entrada.format !== FORMATO_CORTES &&
      !usuario.permissoes.definirOutroEditor &&
      !usuario.permissoes.atribuirEditor
    ) {
      throw new ErroDominio('Você não tem permissão para definir outro Editor.');
    }

    await tx`
      UPDATE demands SET
        title          = ${entrada.title},
        format         = ${entrada.format},
        influencer_id  = ${entrada.influencer_id ?? null},
        editor_id      = ${editorId},
        priority       = ${entrada.priority},
        approval_date  = ${entrada.approval_date ?? null},
        post_date      = ${entrada.post_date ?? null},
        info           = ${entrada.info ?? null},
        link           = ${entrada.link ?? null},
        editorial_line = ${entrada.editorial_line ?? null},
        source_program = ${entrada.source_program ?? null},
        clips_count    = ${entrada.clips_count ?? null},
        updated_at     = now()
      WHERE id = ${entrada.id}
    `;

    await registrarHistorico(tx, {
      demandaId: entrada.id,
      acao: 'Demanda editada',
      usuarioId: usuario.id,
      detalhes: `Título: ${entrada.title} | Formato: ${entrada.format}`,
    });

    return { dados: { id: entrada.id }, mensagem: 'Demanda atualizada com sucesso.' };
  },
};

export const defExcluirDemanda: DefinicaoAcao<typeof schemaExcluirDemanda, { id: string }> = {
  nome: 'excluirDemanda',
  schema: schemaExcluirDemanda,
  permissao: 'excluirDemandas',
  executar: async ({ tx, usuario, entrada }) => {
    const [demanda] = await tx<{ id: string; title: string }[]>`
      SELECT id, title FROM demands
      WHERE id = ${entrada.id} AND deleted_at IS NULL
      FOR UPDATE
    `;
    if (!demanda) throw new ErroDominio('Demanda não encontrada ou já excluída.');

    const agora = new Date();

    await tx`
      UPDATE demands SET deleted_at = ${agora}, updated_at = ${agora}
      WHERE id = ${entrada.id}
    `;

    await tx`
      INSERT INTO demand_trash (demand_id, deleted_at, deleted_by)
      VALUES (${entrada.id}, ${agora}, ${usuario.id})
      ON CONFLICT (demand_id) DO UPDATE SET deleted_at = ${agora}, deleted_by = ${usuario.id}
    `;

    await registrarHistorico(tx, {
      demandaId: entrada.id,
      acao: 'Demanda excluída (Lixeira)',
      usuarioId: usuario.id,
      detalhes: `Título: ${demanda.title}`,
    });

    return { dados: { id: entrada.id }, mensagem: 'Demanda movida para a Lixeira.' };
  },
};

export const defAssumirFicha: DefinicaoAcao<typeof schemaAssumirFicha, { id: string }> = {
  nome: 'assumirFicha',
  schema: schemaAssumirFicha,
  permissao: (u) => u.perfil === 'Editor' || u.perfil === 'Administrador',
  executar: async ({ tx, usuario, entrada }) => {
    const [demanda] = await tx<{
      id: string;
      title: string;
      format: string;
      editor_id: string | null;
    }[]>`
      SELECT id, title, format, editor_id FROM demands
      WHERE id = ${entrada.demandaId} AND deleted_at IS NULL
      FOR UPDATE
    `;
    if (!demanda) throw new ErroDominio('Demanda não encontrada.');
    if (demanda.format === FORMATO_CORTES) {
      throw new ErroDominio('Demandas de Cortes não podem ser assumidas da Fila.');
    }
    if (demanda.editor_id !== null) {
      throw new ErroDominio('Esta demanda já possui um Editor atribuído.');
    }

    await tx`
      UPDATE demands
      SET editor_id  = ${usuario.id},
          updated_at = now()
      WHERE id = ${entrada.demandaId}
    `;

    await registrarHistorico(tx, {
      demandaId: entrada.demandaId,
      acao: 'Editor assumiu a Fila de Fichas',
      usuarioId: usuario.id,
      detalhes: `Demanda: ${demanda.title}`,
    });

    return {
      dados: { id: entrada.demandaId },
      mensagem: `Você assumiu a demanda "${demanda.title}".`,
    };
  },
};

// Type helpers for input inference
export type { EntradaCriarDemanda, EntradaEditarDemanda, EntradaExcluirDemanda, EntradaAssumirFicha };
