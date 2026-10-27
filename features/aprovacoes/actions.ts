'use server';

import { criarAcao } from '@/lib/action';
import { defAprovarEntrega, defRegistrarEntrega, defReprovarEntrega } from './_acoes-def';

export const registrarEntrega = criarAcao(defRegistrarEntrega);
export const aprovarEntrega = criarAcao(defAprovarEntrega);
export const reprovarEntrega = criarAcao(defReprovarEntrega);
