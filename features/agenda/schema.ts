import { z } from 'zod';

export const schemaAgendarPostagem = z.object({
  demandaId: z.string().min(1, 'ID da demanda obrigatório.'),
  postDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida. Use o formato AAAA-MM-DD.'),
});

export const schemaCancelarAgendamento = z.object({
  demandaId: z.string().min(1, 'ID da demanda obrigatório.'),
});

export type EntradaAgendarPostagem = z.infer<typeof schemaAgendarPostagem>;
export type EntradaCancelarAgendamento = z.infer<typeof schemaCancelarAgendamento>;
