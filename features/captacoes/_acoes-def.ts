import 'server-only';
import type { DefinicaoAcao } from '@/lib/action';
import { novoId } from '@/lib/crypto';
import { ErroDominio } from '@/lib/errors';
import { schemaAgendarCaptacao, schemaEditarCaptacao, schemaCancelarCaptacao } from './schema';

const RESTRICOES = {
  captures_videomaker_id_tstzrange_excl: 'Este videomaker já tem Captação neste horário.',
};

// --- Definições exportadas para uso nos testes ---

export const defAgendarCaptacao: DefinicaoAcao<typeof schemaAgendarCaptacao, { id: string }> = {
  nome: 'agendarCaptacao',
  schema: schemaAgendarCaptacao,
  permissao: 'gerenciarCaptacoes',
  restricoes: RESTRICOES,
  executar: async ({ tx, usuario, entrada }) => {
    const id = novoId();
    await tx`
      INSERT INTO captures (id, starts_at, ends_at, videomaker_id, influencer_id, client, subject, location, created_by)
      VALUES (
        ${id},
        ${entrada.startsAt},
        ${entrada.endsAt},
        ${entrada.videomakerId},
        ${entrada.influencerId ?? null},
        ${entrada.client ?? null},
        ${entrada.subject ?? null},
        ${entrada.location ?? null},
        ${usuario.id}
      )
    `;
    return { dados: { id }, mensagem: 'Captação agendada.' };
  },
};

export const defEditarCaptacao: DefinicaoAcao<typeof schemaEditarCaptacao, { id: string }> = {
  nome: 'editarCaptacao',
  schema: schemaEditarCaptacao,
  permissao: 'gerenciarCaptacoes',
  restricoes: RESTRICOES,
  executar: async ({ tx, entrada }) => {
    const [existente] = await tx<{ status: string }[]>`
      SELECT status FROM captures WHERE id = ${entrada.id}
    `;
    if (!existente) throw new ErroDominio('Captação não encontrada.');
    if (existente.status !== 'Agendada') throw new ErroDominio('Só é possível editar Captações Agendadas.');

    await tx`
      UPDATE captures
      SET
        starts_at    = ${entrada.startsAt},
        ends_at      = ${entrada.endsAt},
        videomaker_id = ${entrada.videomakerId},
        influencer_id = ${entrada.influencerId ?? null},
        client       = ${entrada.client ?? null},
        subject      = ${entrada.subject ?? null},
        location     = ${entrada.location ?? null}
      WHERE id = ${entrada.id}
    `;
    return { dados: { id: entrada.id }, mensagem: 'Captação atualizada.' };
  },
};

export const defCancelarCaptacao: DefinicaoAcao<typeof schemaCancelarCaptacao, { id: string }> = {
  nome: 'cancelarCaptacao',
  schema: schemaCancelarCaptacao,
  permissao: 'gerenciarCaptacoes',
  executar: async ({ tx, entrada }) => {
    const [existente] = await tx<{ status: string }[]>`
      SELECT status FROM captures WHERE id = ${entrada.id}
    `;
    if (!existente) throw new ErroDominio('Captação não encontrada.');
    if (existente.status !== 'Agendada') throw new ErroDominio('Só é possível cancelar Captações Agendadas.');

    await tx`UPDATE captures SET status = 'Cancelada' WHERE id = ${entrada.id}`;
    return { dados: { id: entrada.id }, mensagem: 'Captação cancelada.' };
  },
};

// --- Server Actions públicas ---

