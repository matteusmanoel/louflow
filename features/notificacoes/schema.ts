import { z } from 'zod';

/** Hora única do resumo diário, em America/Sao_Paulo. */
export const schemaCadencia = z.object({
  hora: z.number().int().min(0).max(23),
});

export type EntradaCadencia = z.infer<typeof schemaCadencia>;
