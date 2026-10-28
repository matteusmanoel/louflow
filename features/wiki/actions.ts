'use server';

import { criarAcao } from '@/lib/action';
import { defAlterarPublicacaoArtigoWiki, defCriarArtigoWiki, defEditarArtigoWiki } from './acoes-def';

export const criarArtigoWiki = criarAcao(defCriarArtigoWiki);
export const editarArtigoWiki = criarAcao(defEditarArtigoWiki);
export const alterarPublicacaoArtigoWiki = criarAcao(defAlterarPublicacaoArtigoWiki);
