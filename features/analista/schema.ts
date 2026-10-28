import { z } from 'zod';

export const schemaPerguntaAnalista = z.object({
  pergunta: z
    .string()
    .trim()
    .min(1, 'Escreva uma pergunta.')
    .max(1200, 'A pergunta pode ter no máximo 1200 caracteres.'),
});
