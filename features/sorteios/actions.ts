'use server';

import { criarAcao } from '@/lib/action';
import { defCadastrarSorteio, defRegistrarRetirada } from './acoes-def';

export async function cadastrarSorteio(entrada: unknown) {
  return criarAcao(defCadastrarSorteio)(entrada);
}

export async function registrarRetiradaSorteio(entrada: unknown) {
  return criarAcao(defRegistrarRetirada)(entrada);
}
