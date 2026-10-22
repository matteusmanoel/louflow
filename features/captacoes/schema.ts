import { z } from 'zod';

/** Valida que fins > início antes de chegar ao banco. */
const refineHorario = (d: { startsAt: string; endsAt: string }, ctx: z.RefinementCtx) => {
  if (new Date(d.endsAt) <= new Date(d.startsAt)) {
    ctx.addIssue({ code: 'custom', message: 'O horário de fim deve ser posterior ao de início.', path: ['endsAt'] });
  }
};

export const schemaAgendarCaptacao = z
  .object({
    startsAt: z.string().datetime({ message: 'Data de início inválida.' }),
    endsAt: z.string().datetime({ message: 'Data de fim inválida.' }),
    videomakerId: z.string().uuid({ message: 'Videomaker inválido.' }),
    influencerId: z.string().uuid({ message: 'Influencer inválido.' }).optional(),
    client: z.string().max(200).optional(),
    subject: z.string().max(200).optional(),
    location: z.string().max(200).optional(),
  })
  .superRefine(refineHorario);

export const schemaEditarCaptacao = z
  .object({
    id: z.string().min(1, 'ID obrigatório.'),
    startsAt: z.string().datetime({ message: 'Data de início inválida.' }),
    endsAt: z.string().datetime({ message: 'Data de fim inválida.' }),
    videomakerId: z.string().uuid({ message: 'Videomaker inválido.' }),
    influencerId: z.string().uuid({ message: 'Influencer inválido.' }).optional(),
    client: z.string().max(200).optional(),
    subject: z.string().max(200).optional(),
    location: z.string().max(200).optional(),
  })
  .superRefine(refineHorario);

export const schemaCancelarCaptacao = z.object({
  id: z.string().min(1, 'ID obrigatório.'),
});

export type EntradaAgendarCaptacao = z.infer<typeof schemaAgendarCaptacao>;
export type EntradaEditarCaptacao = z.infer<typeof schemaEditarCaptacao>;
export type EntradaCancelarCaptacao = z.infer<typeof schemaCancelarCaptacao>;
