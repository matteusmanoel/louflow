'use server';

import { criarAcao, type DefinicaoAcao } from '@/lib/action';
import { registrarHistorico } from '@/lib/history';
import { ErroDominio } from '@/lib/errors';
import { schemaSalvarFichaTecnica } from './schema';

export type ResultadoFicha = { demandaId: string };

export const defSalvarFichaTecnica: DefinicaoAcao<typeof schemaSalvarFichaTecnica, ResultadoFicha> = {
  nome: 'salvarFichaTecnica',
  schema: schemaSalvarFichaTecnica,
  permissao: 'editarDemandas',
  executar: async ({ tx, usuario, entrada }) => {
    // SELECT FOR UPDATE na linha da Demanda (invariante: mutação de Demanda)
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

export const salvarFichaTecnica = criarAcao(defSalvarFichaTecnica);
