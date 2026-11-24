import 'server-only';
import type { DefinicaoAcao } from '@/lib/action';
import { MSG_NOME } from './acesso';
import {
  confirmarUploads,
  criarPasta,
  enviarLixeira,
  excluirAgora,
  mover,
  prepararUploadDrive,
  renomear,
  restaurar,
} from './dominio';
import {
  schemaConfirmarUploads,
  schemaCriarPasta,
  schemaIds,
  schemaMover,
  schemaPrepararUploadDrive,
  schemaRenomear,
} from './schema';

const permissao = (usuario: { perfil: string }) => usuario.perfil !== 'Premios';
const restricoes = { drive_nodes_nome_vivo_uq: MSG_NOME };

export const defCriarPasta: DefinicaoAcao<typeof schemaCriarPasta, { id: string }> = {
  nome: 'drive:criarPasta',
  schema: schemaCriarPasta,
  permissao,
  restricoes,
  executar: async ({ tx, usuario, entrada }) => ({
    dados: { id: await criarPasta(tx, usuario, entrada.pastaId, entrada.nome) },
    mensagem: 'Pasta criada.',
  }),
};

export const defRenomear: DefinicaoAcao<typeof schemaRenomear, { id: string }> = {
  nome: 'drive:renomear',
  schema: schemaRenomear,
  permissao,
  restricoes,
  executar: async ({ tx, usuario, entrada }) => {
    await renomear(tx, usuario, entrada.id, entrada.nome);
    return { dados: { id: entrada.id }, mensagem: 'Nome atualizado.' };
  },
};

export const defMover: DefinicaoAcao<typeof schemaMover, { quantidade: number }> = {
  nome: 'drive:mover',
  schema: schemaMover,
  permissao,
  restricoes,
  executar: async ({ tx, usuario, entrada }) => {
    await mover(tx, usuario, entrada.ids, entrada.pastaId);
    return { dados: { quantidade: entrada.ids.length }, mensagem: 'Itens movidos.' };
  },
};

export const defEnviarLixeira: DefinicaoAcao<typeof schemaIds, { quantidade: number }> = {
  nome: 'drive:lixeira',
  schema: schemaIds,
  permissao,
  executar: async ({ tx, usuario, entrada }) => {
    await enviarLixeira(tx, usuario, entrada.ids);
    return { dados: { quantidade: entrada.ids.length }, mensagem: 'Itens enviados para a lixeira.' };
  },
};

export const defRestaurar: DefinicaoAcao<typeof schemaIds, { quantidade: number }> = {
  nome: 'drive:restaurar',
  schema: schemaIds,
  permissao,
  restricoes,
  executar: async ({ tx, usuario, entrada }) => {
    await restaurar(tx, usuario, entrada.ids);
    return { dados: { quantidade: entrada.ids.length }, mensagem: 'Itens restaurados.' };
  },
};

export const defExcluirAgora: DefinicaoAcao<typeof schemaIds, { quantidade: number }> = {
  nome: 'drive:excluir',
  schema: schemaIds,
  permissao,
  executar: async ({ tx, usuario, entrada }) => {
    await excluirAgora(tx, usuario, entrada.ids);
    return { dados: { quantidade: entrada.ids.length }, mensagem: 'Itens excluídos.' };
  },
};

export const defPrepararUploadDrive: DefinicaoAcao<
  typeof schemaPrepararUploadDrive,
  { urlEnvio: string; urlArquivo: string }
> = {
  nome: 'drive:prepararUpload',
  schema: schemaPrepararUploadDrive,
  permissao,
  executar: async ({ tx, usuario, entrada }) => ({
    dados: await prepararUploadDrive(tx, usuario, entrada),
    mensagem: 'Link de envio pronto.',
  }),
};

export const defConfirmarUploads: DefinicaoAcao<typeof schemaConfirmarUploads, { ids: string[] }> = {
  nome: 'drive:confirmarUploads',
  schema: schemaConfirmarUploads,
  permissao,
  restricoes,
  executar: async ({ tx, usuario, entrada }) => ({
    dados: { ids: await confirmarUploads(tx, usuario, entrada.pastaId, entrada.arquivos) },
    mensagem: 'Arquivos enviados.',
  }),
};
