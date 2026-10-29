'use server';

import { criarAcao } from '@/lib/action';
import { defLoteDesligamento } from './_acoes-def';

export { desligarUsuario } from './index';

export const processarLoteDesligamento = criarAcao(defLoteDesligamento);
