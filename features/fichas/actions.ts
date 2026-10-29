'use server';

import { criarAcao } from '@/lib/action';
import { defSalvarFichaTecnica } from './_acoes-def';

export const salvarFichaTecnica = criarAcao(defSalvarFichaTecnica);
