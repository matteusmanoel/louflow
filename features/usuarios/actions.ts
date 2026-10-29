'use server';

import { criarAcao } from '@/lib/action';
import { defCriarUsuario, defEditarUsuario, defAtivarUsuario, defDesativarUsuario, defConcederPermissao, defGerenciarDelegados, defRedefinirPin } from './_acoes-def';

export const criarUsuario = criarAcao(defCriarUsuario);
export const editarUsuario = criarAcao(defEditarUsuario);
export const ativarUsuario = criarAcao(defAtivarUsuario);
export const desativarUsuario = criarAcao(defDesativarUsuario);
export const concederPermissao = criarAcao(defConcederPermissao);
/** Alias de concederPermissao com concedida=false. Mesma definição, tratada pelo campo `concedida`. */
export const revogarPermissao = criarAcao(defConcederPermissao);
export const gerenciarDelegados = criarAcao(defGerenciarDelegados);
export const redefinirPin = criarAcao(defRedefinirPin);
