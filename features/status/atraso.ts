import type { StatusDemanda } from './transicoes';

/**
 * Regra de atraso da Demanda (PRD §4.3): o prazo efetivo passou, a Demanda não está em
 * Status Final e não está em Aprovação (nesse caso quem espera é a avaliação, não o Editor).
 * Os contadores em SQL (TV, Dashboard, Ranking, Quadro) aplicam a mesma exclusão; as telas
 * que decidem "em atraso" a partir do prazo em dias devem usar estas funções.
 */
export const STATUS_FORA_DO_ATRASO: readonly StatusDemanda[] = ['Concluída', 'Cancelada', 'Reprovada', 'Aprovação'];

export function demandaAtrasada(status: string, diasParaPrazo: number | null): boolean {
  if (diasParaPrazo === null || diasParaPrazo >= 0) return false;
  return !(STATUS_FORA_DO_ATRASO as readonly string[]).includes(status);
}

export type SituacaoPrazo = 'sem-prazo' | 'atrasada' | 'vencido-em-aprovacao' | 'proximo' | 'no-prazo';

/** Situação de exibição do prazo: prazo vencido em Aprovação não é atraso. */
export function situacaoPrazo(status: string, diasParaPrazo: number | null): SituacaoPrazo {
  if (diasParaPrazo === null) return 'sem-prazo';
  if (demandaAtrasada(status, diasParaPrazo)) return 'atrasada';
  if (diasParaPrazo < 0) return 'vencido-em-aprovacao';
  if (diasParaPrazo <= 1) return 'proximo';
  return 'no-prazo';
}
