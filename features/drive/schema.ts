import { z } from 'zod';
import { schemaArquivos } from '@/features/arquivos/schema';
import { TAMANHO_MAXIMO_BYTES, TIPOS_ARQUIVO } from '@/lib/armazenamento-chave';

const id = z.string().regex(/^[A-Za-z0-9_-]{2,40}$/, 'Identificador inválido.');
const pastaId = id.nullable();
const nome = z.string().trim().min(1, 'Informe o nome.').max(180, 'Nome muito longo.');
const ids = z.array(id).min(1, 'Selecione um item.').max(100, 'São permitidos até 100 itens.');

export const schemaCriarPasta = z.object({ pastaId, nome });
export const schemaRenomear = z.object({ id, nome });
export const schemaMover = z.object({ ids, pastaId });
export const schemaIds = z.object({ ids });
export const schemaPrepararUploadDrive = z.object({
  pastaId,
  nomeArquivo: z.string().trim().min(1, 'Informe o nome do arquivo.').max(180, 'Nome de arquivo muito longo.'),
  tipo: z.enum(TIPOS_ARQUIVO, { message: 'Tipo de arquivo não aceito.' }),
  tamanho: z.number().int('Tamanho de arquivo inválido.').positive('O arquivo está vazio.').max(TAMANHO_MAXIMO_BYTES, 'O arquivo passa de 1 GB.'),
});
export const schemaConfirmarUploads = z.object({
  pastaId,
  arquivos: schemaArquivos.min(1, 'Escolha um arquivo.'),
});

export const schemaZip = z.object({ ids });
