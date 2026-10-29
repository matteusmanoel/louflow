'use server';

import { criarAcao } from '@/lib/action';
import { defConfirmarRecebimento, defAdiarEntrega } from './_acoes-def';

export const confirmarRecebimento = criarAcao(defConfirmarRecebimento);
export const adiarEntrega = criarAcao(defAdiarEntrega);
