import { z } from 'zod';

export const MARCAS = [
  'Loumar',
  'ClickFoz',
  'Apaixonados por Foz',
  'LoumarTV',
  'Ailabiu',
  'Ticket Loko',
  'City Tour',
] as const;

export const FORMATOS = ['imagem', 'reel', 'story'] as const;
export type FormatoMidia = (typeof FORMATOS)[number];

export function midiaAceita(formato: FormatoMidia, mime: string | null): boolean {
  const video = mime === 'video/mp4' || mime === 'video/quicktime';
  if (formato === 'imagem') return mime === 'image/jpeg';
  if (formato === 'reel') return video;
  return mime === 'image/jpeg' || video;
}

export function mensagemMidia(formato: FormatoMidia): string {
  if (formato === 'imagem') return 'Foto precisa ser JPEG.';
  if (formato === 'reel') return 'Reel precisa ser MP4.';
  return 'Story aceita JPEG ou MP4.';
}

const rotulo = z.string().trim().min(2, 'Informe o nome do Business Manager.').max(80, 'O nome pode ter no máximo 80 caracteres.');

export const schemaCriarPortfolio = z.object({ rotulo });

export const schemaPortfolioId = z.object({
  portfolioId: z.string().trim().min(1, 'Informe o Business Manager.'),
});

export const schemaSalvarToken = schemaPortfolioId.extend({
  token: z
    .string()
    .trim()
    .min(20, 'O token parece incompleto.')
    .max(2000, 'O token passa do tamanho esperado.')
    .refine((valor) => !/\s/.test(valor), 'Cole só o token, sem espaços ou quebras de linha.'),
});

const horario = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Informe data e hora.');

export const schemaAgendarPublicacao = z
  .object({
    contaId: z.string().trim().min(1, 'Escolha a conta.'),
    titulo: z.string().trim().min(1, 'Informe o título.').max(200, 'O título pode ter no máximo 200 caracteres.'),
    legenda: z.string().trim().max(2200, 'A legenda pode ter no máximo 2.200 caracteres.'),
    arquivoId: z.string().trim().regex(/^[A-Za-z0-9_-]{2,40}$/, 'Escolha um arquivo do Drive.'),
    demandaId: z.string().trim().min(1).optional(),
    formato: z.enum(FORMATOS, { message: 'Escolha o formato.' }),
    marca: z.enum(MARCAS, { message: 'Escolha a marca.' }),
    quando: horario,
  })
  .superRefine((valor, ctx) => {
    if (valor.formato !== 'story' && valor.legenda.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Informe a legenda.', path: ['legenda'] });
    }
  });

export const schemaPublicacaoId = z.object({
  id: z.string().trim().min(1, 'Informe o agendamento.'),
});
