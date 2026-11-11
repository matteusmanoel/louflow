'use server';

import { criarAcao } from '@/lib/action';
import {
  defConfirmarUploads,
  defCriarPasta,
  defEnviarLixeira,
  defExcluirAgora,
  defMover,
  defPrepararUploadDrive,
  defRenomear,
  defRestaurar,
} from './acoes-def';

export const criarPastaDrive = criarAcao(defCriarPasta);
export const renomearDrive = criarAcao(defRenomear);
export const moverDrive = criarAcao(defMover);
export const enviarLixeiraDrive = criarAcao(defEnviarLixeira);
export const restaurarDrive = criarAcao(defRestaurar);
export const excluirDrive = criarAcao(defExcluirAgora);
export const prepararUploadDrive = criarAcao(defPrepararUploadDrive);
export const confirmarUploadsDrive = criarAcao(defConfirmarUploads);
