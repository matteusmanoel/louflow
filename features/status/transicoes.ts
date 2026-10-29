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

/**
 * Destinos que a interface pode oferecer.
 * Concluída só sai da aprovação da entrega. Aprovação só a partir de Em execução,
 * e só para quem registra a entrega. Os demais destinos exigem alterar o status.
 */
export function destinosStatus(
  status: StatusDemanda,
  opcoes: { podeMover: boolean; podeEntregar: boolean },
): StatusDemanda[] {
  return TRANSICOES[status].filter((destino) => {
    if (destino === 'Concluída') return false;
    if (destino === 'Aprovação') return opcoes.podeEntregar && status === 'Em execução';
    return opcoes.podeMover;
  });
}

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
