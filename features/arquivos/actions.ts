'use server';

import { criarAcao } from '@/lib/action';
import { defDescartarUploads, defPrepararUpload } from './acoes-def';

export const prepararUpload = criarAcao(defPrepararUpload);
export const descartarUploads = criarAcao(defDescartarUploads);
