import 'server-only';
import { MENSAGEM_SEM_PERMISSAO, type DefinicaoAcao } from '@/lib/action';
import { registrarHistorico } from '@/lib/history';
import { ErroDominio } from '@/lib/errors';
import { novoId } from '@/lib/crypto';
import { schemaEnviarFicha, schemaSalvarFichaTecnica } from './schema';

type ResultadoFicha = { demandaId: string };

export const defSalvarFichaTecnica: DefinicaoAcao<typeof schemaSalvarFichaTecnica, ResultadoFicha> = {
  nome: 'salvarFichaTecnica',
  schema: schemaSalvarFichaTecnica,
  permissao: 'editarDemandas',
  executar: async ({ tx, usuario, entrada }) => {
    const [demanda] = await tx<{ id: string }[]>`
      SELECT id FROM demands WHERE id = ${entrada.demandaId} AND deleted_at IS NULL FOR UPDATE
    `;
    if (!demanda) throw new ErroDominio('Demanda não encontrada.');

    await tx`
      INSERT INTO technical_sheets (
        demand_id,
        formato,
        duracao_segundos,
        plataformas,
        briefing,
        observacoes_tecnicas,
        ts_created_at,
        ts_updated_at,
        sent_by,
        sent_at
      )
      VALUES (
        ${entrada.demandaId},
        ${entrada.formato},
        ${entrada.duracaoSegundos},
        ${tx.array(entrada.plataformas)},
        ${entrada.briefing},
        ${entrada.observacoesTecnicas ?? null},
        now(),
        now(),
        ${usuario.id},
        now()
      )
      ON CONFLICT (demand_id) DO UPDATE SET
        formato              = EXCLUDED.formato,
        duracao_segundos     = EXCLUDED.duracao_segundos,
        plataformas          = EXCLUDED.plataformas,
        briefing             = EXCLUDED.briefing,
        observacoes_tecnicas = EXCLUDED.observacoes_tecnicas,
        ts_updated_at        = now()
    `;

    await registrarHistorico(tx, {
      demandaId: entrada.demandaId,
      acao: 'ficha_tecnica_salva',
      usuarioId: usuario.id,
      detalhes: `formato=${entrada.formato} duração=${entrada.duracaoSegundos}s`,
    });

    return { dados: { demandaId: entrada.demandaId }, mensagem: 'Ficha técnica salva.' };
  },
};

export const FORMATO_FICHA_TECNICA = 'Ficha técnica';

/**
 * PRD §4.5: o Influencer envia a ficha e o envio cria uma Demanda (Formato Ficha técnica,
 * Não iniciada). Escopo e dono vêm da Sessão: influencer_id é sempre o usuário logado,
 * nunca um valor da entrada, e a Demanda nasce sem Editor (Fila de Fichas).
 * Portão: enviarFicha E Perfil Influencer. Não concede editarDemandas.
 */
export const defEnviarFichaTecnica: DefinicaoAcao<typeof schemaEnviarFicha, ResultadoFicha> = {
  nome: 'enviarFichaTecnica',
  schema: schemaEnviarFicha,
  permissao: (u) => u.permissoes.enviarFicha && u.perfil === 'Influencer',
  restricoes: { technical_sheets_submission_key_key: 'Esta ficha já foi enviada.' },
  executar: async ({ tx, usuario, entrada }) => {
    if (entrada.chaveEnvio) {
      const [anterior] = await tx<{ demand_id: string; sent_by: string }[]>`
        SELECT demand_id, sent_by FROM technical_sheets WHERE submission_key = ${entrada.chaveEnvio}`;
      if (anterior) {
        // Chave de outra pessoa nunca devolve a Demanda dela.
        if (anterior.sent_by !== usuario.id) throw new ErroDominio(MENSAGEM_SEM_PERMISSAO);
        return { dados: { demandaId: anterior.demand_id }, mensagem: 'Esta ficha já foi enviada.' };
      }
    }

    if (entrada.editorSugeridoId) {
      const [editor] = await tx<{ id: string }[]>`
        SELECT id FROM users WHERE id = ${entrada.editorSugeridoId} AND profile = 'Editor' AND is_active`;
      if (!editor) throw new ErroDominio('Editor sugerido inválido.');
    }

    const demandaId = novoId('LF');
    await tx`
      INSERT INTO demands (
        id, title, format, influencer_id, editor_id, post_date, info, link, created_by
      ) VALUES (
        ${demandaId},
        ${entrada.identificacao},
        ${FORMATO_FICHA_TECNICA},
        ${usuario.id},
        NULL,
        ${entrada.previsaoPublicacao ?? null},
        ${entrada.observacaoEditor ?? null},
        ${entrada.linkArquivos ?? null},
        ${usuario.id}
      )`;

    await tx`
      INSERT INTO technical_sheets (
        demand_id, submission_key, identification, editor_note, expected_publication,
        script, opening, sound_bite, information, files_link, written_script,
        gc_lettering, ssd_material, platform, content_format, visual_references,
        suggested_editor_id, sent_by, sent_at
      ) VALUES (
        ${demandaId},
        ${entrada.chaveEnvio ?? null},
        ${entrada.identificacao},
        ${entrada.observacaoEditor ?? null},
        ${entrada.previsaoPublicacao ?? null},
        ${entrada.roteiro ?? null},
        ${entrada.cabeca ?? null},
        ${entrada.sonora ?? null},
        ${entrada.informacoes ?? null},
        ${entrada.linkArquivos ?? null},
        ${entrada.roteiroEscrito ?? null},
        ${entrada.gcLettering ?? null},
        ${entrada.materialSsd ?? null},
        ${entrada.plataforma ?? null},
        ${entrada.formatoConteudo ?? null},
        ${entrada.referenciasVisuais ?? null},
        ${entrada.editorSugeridoId ?? null},
        ${usuario.id},
        now()
      )`;

    await registrarHistorico(tx, {
      demandaId,
      acao: 'Demanda criada',
      usuarioId: usuario.id,
      detalhes: `Título: ${entrada.identificacao} | Formato: ${FORMATO_FICHA_TECNICA}`,
    });
    await registrarHistorico(tx, {
      demandaId,
      acao: 'ficha_tecnica_enviada',
      usuarioId: usuario.id,
    });

    return { dados: { demandaId }, mensagem: 'Ficha enviada. A Demanda entrou na Fila de Fichas.' };
  },
};
