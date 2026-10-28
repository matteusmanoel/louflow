import { z } from 'zod';

const mensagemOrdem = 'A ordem deve estar entre 1 e 999.';
const mensagemConteudo = 'O conteúdo pode ter no máximo 15.000 caracteres.';

export const schemaSalvarArtigoWiki = z.object({
  category: z.string().trim().min(1, 'Informe a categoria.').max(120, 'A categoria pode ter no máximo 120 caracteres.'),
  title: z.string().trim().min(1, 'Informe o título.').max(200, 'O título pode ter no máximo 200 caracteres.'),
  summary: z.string().trim().max(500, 'O resumo pode ter no máximo 500 caracteres.'),
  content: z.string().trim().min(1, 'Informe o conteúdo.').max(15000, mensagemConteudo),
  position: z.number().int(mensagemOrdem).min(1, mensagemOrdem).max(999, mensagemOrdem),
  is_published: z.boolean(),
});

export type EntradaSalvarArtigoWiki = z.infer<typeof schemaSalvarArtigoWiki>;

export const schemaEditarArtigoWiki = schemaSalvarArtigoWiki.extend({
  id: z.string().trim().min(1, 'Informe o artigo.'),
});

export type EntradaEditarArtigoWiki = z.infer<typeof schemaEditarArtigoWiki>;

export const schemaAlterarPublicacaoArtigoWiki = z.object({
  id: z.string().trim().min(1, 'Informe o artigo.'),
  is_published: z.boolean(),
});

export type EntradaAlterarPublicacaoArtigoWiki = z.infer<typeof schemaAlterarPublicacaoArtigoWiki>;
