/** Fotos do catálogo legado, somente leitura. A chave é o nome do arquivo. */
export const CATALOGO = [
  { arquivo: 'ssd-s3-256gb.jpg', rotulo: 'SSD S3 256 GB' },
  { arquivo: 'ssd-lexar-1tb.jpg', rotulo: 'SSD Lexar 1 TB' },
  { arquivo: 'ssd-hoco-01.jpg', rotulo: 'SSD Hoco' },
  { arquivo: 'tripe-ticket.jpg', rotulo: 'Tripé' },
  { arquivo: 'dji-mic-mini-1.jpg', rotulo: 'DJI Mic Mini' },
  { arquivo: 'dji-mic-mini-1-aberto.jpg', rotulo: 'DJI Mic Mini aberto' },
  { arquivo: 'dji-mic-2-01.jpg', rotulo: 'DJI Mic 2' },
  { arquivo: 'dji-mic-2-01-aberto.jpg', rotulo: 'DJI Mic 2 aberto' },
  { arquivo: 'holly-01.jpg', rotulo: 'Hollyland 01' },
  { arquivo: 'holly-02.jpg', rotulo: 'Hollyland 02' },
  { arquivo: 'holly-03.jpg', rotulo: 'Hollyland 03' },
  { arquivo: 'holly-03-componentes.jpg', rotulo: 'Hollyland 03, componentes' },
] as const;

export type ItemCatalogo = (typeof CATALOGO)[number];
