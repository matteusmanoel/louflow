import { z } from 'zod';

export const schemaRegistrarEntrega = z.object({
  demandaId: z.string().min(1, 'ID da Demanda obrigatório.'),
  arquivoUrl: z.string().url('URL do arquivo inválida.'),
  observacoes: z.string().max(1000, 'Observações muito longas.').optional(),
});

export const schemaAprovarEntrega = z.object({
  entregaId: z.string().min(1, 'ID da Entrega obrigatório.'),
  observacoes: z.string().max(1000, 'Observações muito longas.').optional(),
});

export const schemaReprovarEntrega = z.object({
  entregaId: z.string().min(1, 'ID da Entrega obrigatório.'),
  observacoes: z.string().max(1000, 'Observações muito longas.').optional(),
  motivoRejeicao: z.string().min(1, 'Motivo de rejeição obrigatório.').max(1000, 'Motivo muito longo.'),
});

export type EntradaRegistrarEntrega = z.infer<typeof schemaRegistrarEntrega>;
export type EntradaAprovarEntrega = z.infer<typeof schemaAprovarEntrega>;
export type EntradaReprovarEntrega = z.infer<typeof schemaReprovarEntrega>;
