'use server';

import { criarAcao } from '@/lib/action';
import { defAgendarCaptacao, defEditarCaptacao, defCancelarCaptacao } from './_acoes-def';

export const agendarCaptacao = criarAcao(defAgendarCaptacao);
export const editarCaptacao = criarAcao(defEditarCaptacao);
export const cancelarCaptacao = criarAcao(defCancelarCaptacao);
