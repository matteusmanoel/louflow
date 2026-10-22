import { z } from 'zod';

export const schemaSalvarFichaTecnica = z.object({
  demandaId: z.string().min(1, 'ID da Demanda obrigatório.'),
  formato: z.string().min(1, 'Formato obrigatório.').max(100),
  duracaoSegundos: z
    .number()
    .int('Duração deve ser inteiro.')
    .positive('Duração deve ser positiva.'),
  plataformas: z
    .array(z.string().min(1))
    .min(1, 'Informe ao menos uma plataforma.'),
  briefing: z.string().min(1, 'Briefing obrigatório.').max(5000),
  observacoesTecnicas: z.string().max(2000).optional(),
});

export type EntradaSalvarFichaTecnica = z.infer<typeof schemaSalvarFichaTecnica>;
