import 'server-only';
import { z } from 'zod';
import type { DefinicaoAcao } from '@/lib/action';
import { ErroDominio } from '@/lib/errors';
import { garantirCanalParaEnvio } from './canal';
import { enviarNotificacao } from './enviador';
import { modelosEnsaio } from './mensagens';
import { schemaCadencia } from './schema';

export const schemaEnsaio = z.object({}).optional();

export const defSalvarCadencia: DefinicaoAcao<typeof schemaCadencia, null> = {
  nome: 'salvarCadencia',
  schema: schemaCadencia,
  permissao: 'gerenciarUsuarios',
  executar: async () => {
    throw new ErroDominio('O resumo do grupo sai às 10h. Para mudar esse horário, fale com o suporte.');
  },
};

export const defEnviarEnsaio: DefinicaoAcao<typeof schemaEnsaio, null> = {
  nome: 'enviarEnsaio',
  schema: schemaEnsaio,
  permissao: 'gerenciarUsuarios',
  executar: async ({ tx }) => {
    garantirCanalParaEnvio();
    try {
      for (const modelo of modelosEnsaio()) await enviarNotificacao(tx, modelo);
    } catch (erro) {
      if (erro instanceof ErroDominio) throw erro;
      throw new ErroDominio('Não foi possível enviar o ensaio.');
    }
    return { dados: null, mensagem: 'Ensaio enviado para o destino configurado.' };
  },
};

