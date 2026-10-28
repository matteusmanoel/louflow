import 'server-only';
import type { DefinicaoAcao } from '@/lib/action';
import { responder } from './responder';
import { schemaPerguntaAnalista } from './schema';
import { consumirIntervalo } from './intervalo';

export const defPerguntarAnalista: DefinicaoAcao<typeof schemaPerguntaAnalista, { resposta: string }> = {
  nome: 'perguntarAnalista',
  schema: schemaPerguntaAnalista,
  permissao: 'usarAnalista',
  executar: async ({ tx, usuario, entrada }) => {
    consumirIntervalo(usuario.id);
    const resposta = await responder(tx, entrada.pergunta);
    return { dados: { resposta }, mensagem: resposta };
  },
};
