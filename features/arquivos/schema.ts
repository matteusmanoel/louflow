import { z } from 'zod';
import { GRUPOS_ARQUIVO, LIMITE_ARQUIVOS, TAMANHO_MAXIMO_BYTES, TIPOS_ARQUIVO } from '@/lib/armazenamento-chave';

export const schemaItemArquivo = z.object({
  url: z.string().url('URL do arquivo inválida.'),
  nome: z.string().trim().min(1, 'Informe o nome do arquivo.').max(180, 'Nome de arquivo muito longo.'),
  tipo: z.enum(TIPOS_ARQUIVO, { message: 'Tipo de arquivo não aceito.' }),
  tamanho: z
    .number()
    .int('Tamanho de arquivo inválido.')
    .positive('O arquivo está vazio.')
    .max(TAMANHO_MAXIMO_BYTES, 'O arquivo passa de 1 GB.'),
});

export const schemaArquivos = z.array(schemaItemArquivo).max(LIMITE_ARQUIVOS, 'São permitidos até 20 arquivos.');

export const schemaPrepararUpload = z.object({
  grupo: z.enum(GRUPOS_ARQUIVO, { message: 'Pasta de arquivo inválida.' }),
  donoId: z.string().regex(/^[A-Za-z0-9_-]{2,40}$/, 'Identificador inválido.'),
  nomeArquivo: z.string().trim().min(1, 'Informe o nome do arquivo.').max(180, 'Nome de arquivo muito longo.'),
  tipo: z.enum(TIPOS_ARQUIVO, { message: 'Tipo de arquivo não aceito.' }),
  tamanho: z
    .number()
    .int('Tamanho de arquivo inválido.')
    .positive('O arquivo está vazio.')
    .max(TAMANHO_MAXIMO_BYTES, 'O arquivo passa de 1 GB.'),
});

export const schemaDescartarUploads = z.object({
  urls: z.array(z.string().url('URL do arquivo inválida.')).max(LIMITE_ARQUIVOS, 'São permitidos até 20 arquivos.'),
});

export type ItemArquivo = z.infer<typeof schemaItemArquivo>;
export type EntradaPrepararUpload = z.infer<typeof schemaPrepararUpload>;
export type EntradaDescartarUploads = z.infer<typeof schemaDescartarUploads>;
