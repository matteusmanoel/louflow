import 'server-only';
import type { DefinicaoAcao } from '@/lib/action';
import { prepararEnvio } from '@/lib/armazenamento';
import { schemaPrepararUpload } from './schema';

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
