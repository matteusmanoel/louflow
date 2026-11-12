'use server';

import { criarAcao } from '@/lib/action';
import { defEnviarFichaTecnica, defSalvarFichaTecnica } from './_acoes-def';

export const salvarFichaTecnica = criarAcao(defSalvarFichaTecnica);

/** Influencer envia a ficha e cria a Demanda (PRD §4.5). */
export const enviarFichaTecnica = criarAcao(defEnviarFichaTecnica);
