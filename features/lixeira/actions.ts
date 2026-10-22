'use server';

import { criarAcao } from '@/lib/action';
import { defRestaurarDemanda, defExcluirDefinitivamente } from './_acoes-def';

/** Restaura uma Demanda da lixeira (sets deleted_at = null). */
export const restaurarDemanda = criarAcao(defRestaurarDemanda);

/** Exclui definitivamente uma Demanda que está na lixeira. */
export const excluirDefinitivamente = criarAcao(defExcluirDefinitivamente);
