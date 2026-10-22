import { z } from 'zod';

export const LINHAS_EDITORIAIS = ['Viral', 'Comunidade', 'Educacional'] as const;
export const PROGRAMAS_ORIGEM = ['Destino Iguaçu News', 'Descubra Foz', 'Outros'] as const;

export const schemaCriarCorte = z.object({
  titulo: z.string().min(1, 'Informe o título.').max(300, 'Título muito longo.'),
  influencerId: z.string().uuid('Influencer inválido.').nullable().optional(),
  dataPostagem: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de postagem inválida.'),
  linhaEditorial: z.enum(LINHAS_EDITORIAIS, { message: 'Linha editorial inválida.' }),
  linkVideo: z.string().url('Link do vídeo inválido.').nullable().optional(),
  programaOrigem: z.enum(PROGRAMAS_ORIGEM, { message: 'Programa de origem inválido.' }),
});

export const schemaConcluirCorte = z.object({
  id: z.string().min(1, 'ID do corte obrigatório.'),
  quantidadeProduzida: z
    .number({ message: 'Informe a quantidade produzida.' })
    .int('Quantidade deve ser inteira.')
    .min(1, 'Mínimo de 1 corte.')
    .max(999, 'Máximo de 999 cortes.'),
});

export type EntradaCriarCorte = z.infer<typeof schemaCriarCorte>;
export type EntradaConcluirCorte = z.infer<typeof schemaConcluirCorte>;
