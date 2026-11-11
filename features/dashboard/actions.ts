'use server';

import { z } from 'zod';
import { criarAcao } from '@/lib/action';
import { listarAvisosRecentes } from './avisos';

export const carregarAvisos = criarAcao({
  nome: 'carregarAvisos',
  schema: z.object({}),
  permissao: (usuario) => usuario.perfil !== 'Premios',
  executar: async ({ tx, usuario }) => ({
    dados: await listarAvisosRecentes(tx, usuario),
    mensagem: 'Avisos carregados.',
  }),
});
