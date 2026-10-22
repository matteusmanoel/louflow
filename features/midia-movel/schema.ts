import { z } from 'zod';

export const schemaCriarReserva = z.object({
  startsAt: z.coerce.date({ error: 'Data de início inválida.' }),
  endsAt: z.coerce.date({ error: 'Data de fim inválida.' }),
  reason: z.string().trim().min(3, 'Motivo deve ter ao menos 3 caracteres.').max(500, 'Motivo muito longo.'),
});

export type EntradaCriarReserva = z.infer<typeof schemaCriarReserva>;

export const schemaCancelarReserva = z.object({
  id: z.string().min(1, 'ID obrigatório.'),
});

export type EntradaCancelarReserva = z.infer<typeof schemaCancelarReserva>;
