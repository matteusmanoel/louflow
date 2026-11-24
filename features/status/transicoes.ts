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
 * Regra de propriedade do Editor (sem a permissão alterarStatus): na Demanda em que ele é o Editor
 * responsável, só pode iniciar o trabalho, isto é, ir para Em execução a partir de Não iniciada ou
 * de Ajustes solicitados. Pausar, cancelar e demais destinos continuam exigindo alterarStatus.
 * O servidor confere o dono (editor_id = Sessão) antes de aplicar; a interface só espelha.
 */
export const ORIGENS_DE_INICIO_PELO_RESPONSAVEL: readonly StatusDemanda[] = ['Não iniciada', 'Ajustes solicitados'];

export function responsavelPodeIniciar(status: StatusDemanda, destino: StatusDemanda): boolean {
  return destino === 'Em execução' && ORIGENS_DE_INICIO_PELO_RESPONSAVEL.includes(status);
}

/**
 * Destinos que a interface pode oferecer.
 * Concluída só sai da aprovação da entrega. Aprovação só a partir de Em execução,
 * e só para quem registra a entrega. Os demais destinos exigem alterar o status.
 */
export function destinosStatus(
  status: StatusDemanda,
  opcoes: { podeMover: boolean; podeEntregar: boolean; podeIniciar?: boolean },
): StatusDemanda[] {
  return TRANSICOES[status].filter((destino) => {
    if (destino === 'Concluída') return false;
    if (destino === 'Aprovação') return opcoes.podeEntregar && status === 'Em execução';
    if (opcoes.podeIniciar && responsavelPodeIniciar(status, destino)) return true;
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
