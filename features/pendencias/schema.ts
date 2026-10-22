import { z } from 'zod';

export const schemaConfirmarRecebimento = z.object({
  demandaId: z.string().min(1, 'ID da Demanda obrigatório.'),
});

export const schemaAdiarEntrega = z.object({
  demandaId: z.string().min(1, 'ID da Demanda obrigatório.'),
  novaData: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (AAAA-MM-DD).')
    .refine((d) => new Date(d) > new Date(), 'A nova data deve ser futura.'),
  motivo: z.string().min(1, 'Motivo obrigatório.').max(500, 'Motivo muito longo.'),
});

export type EntradaConfirmarRecebimento = z.infer<typeof schemaConfirmarRecebimento>;
export type EntradaAdiarEntrega = z.infer<typeof schemaAdiarEntrega>;
