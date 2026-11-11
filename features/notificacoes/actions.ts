'use server';

import { criarAcao } from '@/lib/action';
import { defEnviarEnsaio, defSalvarCadencia } from './acoes-def';

/** S1-08: cadência do feed do setor. Só quem gerencia usuários. */
export const salvarCadencia = criarAcao(defSalvarCadencia);

/** Manda um exemplar de cada modelo para o destino configurado. Não alcança o grupo sem liberação. */
export const enviarEnsaio = criarAcao(defEnviarEnsaio);
