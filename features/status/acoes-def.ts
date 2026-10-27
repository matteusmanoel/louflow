import 'server-only';
import { z } from 'zod';
import type { DefinicaoAcao } from '@/lib/action';
import { ErroDominio } from '@/lib/errors';
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
  executar: async ({ tx, usuario, entrada }) => {
    if (entrada.novoStatus === 'Cancelada' && !entrada.motivo?.trim()) {
      throw new ErroDominio('Informe o motivo do cancelamento.');
    }
    await transicionarStatus(tx, {
      demandaId: entrada.demandaId,
      novoStatus: entrada.novoStatus,
      usuarioId: usuario.id,
      motivo: entrada.motivo?.trim() || undefined,
    });
    return { dados: { id: entrada.demandaId }, mensagem: 'Status atualizado.' };
  },
};
