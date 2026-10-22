import { z } from 'zod';

export const schemaAdicionarComentario = z.object({
  demandaId: z.string().min(1, 'ID da demanda obrigatório.'),
  conteudo: z
    .string()
    .min(1, 'Comentário não pode ser vazio.')
    .max(2000, 'Máximo de 2 000 caracteres.'),
});

export const schemaExcluirComentario = z.object({
  comentarioId: z.string().min(1, 'ID do comentário obrigatório.'),
});

export type EntradaAdicionarComentario = z.infer<typeof schemaAdicionarComentario>;
export type EntradaExcluirComentario = z.infer<typeof schemaExcluirComentario>;
