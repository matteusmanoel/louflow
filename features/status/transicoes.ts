export type StatusDemanda =
  | 'Não iniciada'
  | 'Em execução'
  | 'Pausada'
  | 'Aprovação'
  | 'Ajustes solicitados'
  | 'Concluída'
  | 'Reprovada'
  | 'Cancelada';

/**
 * Transições válidas do estado da Demanda.
 * Única fonte de verdade da máquina. O cliente importa daqui; a escrita fica em index.ts.
 */
export const TRANSICOES: Record<StatusDemanda, readonly StatusDemanda[]> = {
  'Não iniciada': ['Em execução', 'Cancelada'],
  'Em execução': ['Aprovação', 'Pausada', 'Cancelada'],
  Pausada: ['Em execução', 'Cancelada'],
  Aprovação: ['Concluída', 'Ajustes solicitados', 'Em execução', 'Cancelada'],
  'Ajustes solicitados': ['Em execução', 'Cancelada'],
  Concluída: [],
  Reprovada: [],
  Cancelada: [],
};

/** Colunas do quadro, na ordem do fluxo. */
export const COLUNAS_QUADRO: readonly StatusDemanda[] = [
  'Não iniciada',
  'Em execução',
  'Pausada',
  'Ajustes solicitados',
  'Aprovação',
  'Concluída',
  'Reprovada',
  'Cancelada',
];
