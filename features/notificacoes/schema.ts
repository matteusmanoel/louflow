import { z } from 'zod';

/** Cadência definida pelo admin. Prazo em dias de antecedência; pendência em horas de folga. */
export const schemaCadencia = z.object({
  horaPrazo: z.number().int().min(0).max(23),
  antecedenciaDias: z.number().int().min(1).max(14),
  horaPendencia: z.number().int().min(0).max(23),
  folgaHoras: z.number().int().min(1).max(168),
});

export type EntradaCadencia = z.infer<typeof schemaCadencia>;
