'use server';

import { criarAcao } from '@/lib/action';
import { defAgendarPostagem, defCancelarAgendamento } from './_acoes-def';

export const agendarPostagem = criarAcao(defAgendarPostagem);
export const cancelarAgendamento = criarAcao(defCancelarAgendamento);
