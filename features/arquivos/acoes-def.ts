import 'server-only';
import type { DefinicaoAcao } from '@/lib/action';
import { env } from '@/lib/env';
import { prepararEnvio, removerObjetos } from '@/lib/armazenamento';
import { chavesOrfas } from './orfaos';
import { schemaDescartarUploads, schemaPrepararUpload } from './schema';

export const defPrepararUpload: DefinicaoAcao<
  typeof schemaPrepararUpload,
  { urlEnvio: string; urlArquivo: string }
> = {
  nome: 'prepararUpload',
  schema: schemaPrepararUpload,
  permissao: (usuario) => usuario.perfil !== 'Premios',
  executar: async ({ entrada }) => {
    const dados = await prepararEnvio({
      grupo: entrada.grupo,
      donoId: entrada.donoId,
      nomeArquivo: entrada.nomeArquivo,
      tipo: entrada.tipo,
    });
    return { dados, mensagem: 'Link de envio pronto.' };
  },
};

export const defDescartarUploads: DefinicaoAcao<typeof schemaDescartarUploads, { removidos: number }> = {
  nome: 'descartarUploads',
  schema: schemaDescartarUploads,
  permissao: (usuario) => usuario.perfil !== 'Premios',
  executar: async ({ tx, entrada }) => {
    const cfg = env.armazenamento;
    if (!cfg || entrada.urls.length === 0) {
      return { dados: { removidos: 0 }, mensagem: 'Nada a descartar.' };
    }
    const chaves = await chavesOrfas(tx, entrada.urls, cfg.bucket, cfg.regiao);
    if (chaves.length > 0) await removerObjetos(chaves);
    return { dados: { removidos: chaves.length }, mensagem: 'Arquivos descartados.' };
  },
};
