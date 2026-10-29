'use server';

import { criarAcao } from '@/lib/action';
import {
  defAlterarPrioridade,
  defAssumirFicha,
  defCriarDemanda,
  defEditarDemanda,
  defExcluirDemanda,
} from './_acoes-def';

/** Cria uma nova Demanda. */
export const criarDemanda = criarAcao(defCriarDemanda);

/** Edita uma Demanda existente. */
export const editarDemanda = criarAcao(defEditarDemanda);

/** Exclui (soft delete) uma Demanda, enviando-a para a Lixeira. */
export const excluirDemanda = criarAcao(defExcluirDemanda);

/**
 * Editor assume uma Demanda da Fila de Fichas.
 * Regras: formato não pode ser Cortes; demanda deve estar sem editor.
 */
export const assumirFicha = criarAcao(defAssumirFicha);

/** Altera só a prioridade. O status continua em features/status. */
export const alterarPrioridadeDemanda = criarAcao(defAlterarPrioridade);
