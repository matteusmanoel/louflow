import 'server-only';
import { z } from 'zod';
import type { DefinicaoAcao } from '@/lib/action';
import { ErroDominio } from '@/lib/errors';
import { textoAjuste } from '@/features/notificacoes/mensagens';
import { transicionarStatus } from './index';

const STATUS = [
  'Não iniciada',
  'Em execução',
  'Pausada',
  'Aprovação',
  'Ajustes solicitados',
  'Concluída',
  'Reprovada',
  'Cancelada',
] as const;

export const schemaAlterarStatus = z.object({
  demandaId: z.string().min(1, 'ID da Demanda obrigatório.'),
  novoStatus: z.enum(STATUS),
  motivo: z.string().max(1000, 'Motivo muito longo.').optional(),
});

export const defAlterarStatus: DefinicaoAcao<typeof schemaAlterarStatus, { id: string }> = {
  nome: 'alterarStatus',
  schema: schemaAlterarStatus,
  permissao: 'alterarStatus',
  executar: async ({ tx, usuario, entrada, notificar }) => {
    if (entrada.novoStatus === 'Cancelada' && !entrada.motivo?.trim()) {
      throw new ErroDominio('Informe o motivo do cancelamento.');
    }
    await transicionarStatus(tx, {
      demandaId: entrada.demandaId,
      novoStatus: entrada.novoStatus,
      usuarioId: usuario.id,
      motivo: entrada.motivo?.trim() || undefined,
    });
    if (entrada.novoStatus === 'Ajustes solicitados') {
      const [demanda] = await tx<{ title: string; editor_id: string | null }[]>`
        SELECT title, editor_id FROM demands WHERE id = ${entrada.demandaId}`;
      if (demanda) {
        notificar({
          tipo: 'ajuste_solicitado',
          destinatarios: demanda.editor_id ? [demanda.editor_id] : [],
          assunto: `Ajuste solicitado: ${demanda.title}`,
          texto: textoAjuste(demanda.title, demanda.editor_id, entrada.motivo),
          demandaId: entrada.demandaId,
        });
      }
    }
    return { dados: { id: entrada.demandaId }, mensagem: 'Status atualizado.' };
  },
};
