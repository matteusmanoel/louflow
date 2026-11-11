export function lerVisao(valor: string | undefined): 'cards' | 'lista' {
  return valor === 'lista' ? 'lista' : 'cards';
}

export function rotuloTipo(item: { tipoItem: 'pasta' | 'arquivo'; mime: string | null }): string {
  if (item.tipoItem === 'pasta') return 'Pasta';
  if (item.mime?.startsWith('image/')) return 'Imagem';
  if (item.mime?.startsWith('video/')) return 'Vídeo';
  if (item.mime?.startsWith('audio/')) return 'Áudio';
  if (item.mime === 'application/pdf') return 'PDF';
  if (item.mime?.includes('zip')) return 'ZIP';
  return 'Arquivo';
}

export function formatarTamanho(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  const inteiro = Math.round(bytes);
  if (inteiro < 1024) return `${inteiro} B`;
  const unidades = ['KB', 'MB', 'GB', 'TB'];
  let valor = inteiro / 1024;
  let indice = 0;
  while (indice < unidades.length - 1) {
    const casas = valor >= 10 ? 0 : 1;
    if (Number(valor.toFixed(casas)) < 1024) break;
    valor /= 1024;
    indice += 1;
  }
  const casas = valor >= 10 ? 0 : 1;
  return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: casas })} ${unidades[indice]}`;
}
