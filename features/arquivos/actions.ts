'use server';

import { criarAcao } from '@/lib/action';
import { defPrepararUpload } from './acoes-def';

export const prepararUpload = criarAcao(defPrepararUpload);
