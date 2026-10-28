'use server';

import { criarAcao } from '@/lib/action';
import { defPerguntarAnalista } from './acoes-def';

export async function perguntarAnalista(entrada: unknown) {
  return criarAcao(defPerguntarAnalista)(entrada);
}
