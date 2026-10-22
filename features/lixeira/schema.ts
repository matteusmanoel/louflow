import { z } from 'zod';

export const schemaRestaurarDemanda = z.object({
  demandaId: z.string().min(1),
});

export const schemaExcluirDefinitivamente = z.object({
  demandaId: z.string().min(1),
});

export type EntradaRestaurarDemanda = z.infer<typeof schemaRestaurarDemanda>;
export type EntradaExcluirDefinitivamente = z.infer<typeof schemaExcluirDefinitivamente>;
