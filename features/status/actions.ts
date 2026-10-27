'use server';

import { criarAcao } from '@/lib/action';
import { defAlterarStatus } from './acoes-def';

/** Muda o status de uma Demanda pela máquina protegida. */
export const alterarStatusDemanda = criarAcao(defAlterarStatus);
