'use server';

import { criarAcao } from '@/lib/action';
import { defAdicionarComentario, defExcluirComentario } from './_acoes-def';

export const adicionarComentario = criarAcao(defAdicionarComentario);
export const excluirComentario = criarAcao(defExcluirComentario);
