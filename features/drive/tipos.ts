export type ItemDrive = {
  id: string;
  nome: string;
  tipoItem: 'pasta' | 'arquivo';
  /** Pasta de Demanda ou de Corte: acompanha o registro e não se move. */
  fixa: boolean;
  mime: string | null;
  tamanho: number | null;
  criadoEm: string;
  apagadoEm: string | null;
  url: string | null;
  urlDownload: string | null;
  vinculadoEntrega: boolean;
};

export type TrilhaDrive = {
  id: string | null;
  nome: string;
};

export type DestinoDrive = {
  id: string | null;
  rotulo: string;
};

export type CotaDrive = {
  usado: number;
  limite: number;
};

export type VistaDrive = {
  nome: string;
  detalhe: string | null;
  trilha: TrilhaDrive[];
  itens: ItemDrive[];
};
