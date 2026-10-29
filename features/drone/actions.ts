'use server';

import { criarAcao } from '@/lib/action';
import { defRegistrarUsoDrone, defEditarUsoDrone, defCancelarUsoDrone } from './_acoes-def';

export const registrarUsoDrone = criarAcao(defRegistrarUsoDrone);
export const editarUsoDrone = criarAcao(defEditarUsoDrone);
export const cancelarUsoDrone = criarAcao(defCancelarUsoDrone);
