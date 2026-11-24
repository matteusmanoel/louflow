/** Grupo do objeto no bucket. Demanda, Corte e pasta livre não compartilham prefixo. */
export const GRUPOS_ARQUIVO = ['demandas', 'cortes', 'drive'] as const;
export type GrupoArquivo = (typeof GRUPOS_ARQUIVO)[number];

export const TIPOS_ARQUIVO = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/aac',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
] as const;
export type TipoArquivo = (typeof TIPOS_ARQUIVO)[number];

/** 1 GB. Acima disso o envio direto por uma única requisição deixa de ser confiável no navegador. */
export const TAMANHO_MAXIMO_BYTES = 1024 * 1024 * 1024;
export const ROTULO_TAMANHO_MAXIMO = '1 GB';
export const LIMITE_ARQUIVOS = 20;

const EXPIRACAO_ENVIO_SEGUNDOS = 15 * 60;
const EXPIRACAO_LEITURA_SEGUNDOS = 60 * 60;

export { EXPIRACAO_ENVIO_SEGUNDOS, EXPIRACAO_LEITURA_SEGUNDOS };

const CHAVE_NOVA = /^(demandas|cortes|drive)\/[A-Za-z0-9_-]{2,40}\/[0-9a-f-]{36}-[a-z0-9._-]{1,80}$/;
const CHAVE_LEGADA = /^(entregas|demandas|cortes)\/\d{4}\/\d{2}\/[0-9a-f-]{36}-[a-z0-9._-]{1,80}$/;

export function nomeSeguro(nome: string): string {
  const base = nome.split(/[/\\]/).pop() ?? '';
  const semAcento = base.normalize('NFD').replace(/\p{M}/gu, '');
  const limpo = semAcento
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  if (!limpo || limpo === '.' || limpo === '..') return 'arquivo';
  return limpo;
}

/** Prefixo + 10 hex. O mesmo formato de `novoId` no servidor, utilizável no navegador. */
export function novoIdPasta(prefixo: 'LF' | 'CL'): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${prefixo}${hex}`;
}

export function idDonoSeguro(id: string): string | null {
  return /^[A-Za-z0-9_-]{2,40}$/.test(id) ? id : null;
}

export function montarChave(grupo: GrupoArquivo, donoId: string, nomeArquivo: string, id = crypto.randomUUID()): string {
  const dono = idDonoSeguro(donoId);
  if (!dono) throw new Error('Identificador inválido.');
  return `${grupo}/${dono}/${id}-${nomeSeguro(nomeArquivo)}`;
}

export function urlDoObjeto(bucket: string, regiao: string, chave: string): string {
  const caminho = chave.split('/').map(encodeURIComponent).join('/');
  return `https://${bucket}.s3.${regiao}.amazonaws.com/${caminho}`;
}

export function chavePermitida(chave: string): boolean {
  return CHAVE_NOVA.test(chave) || CHAVE_LEGADA.test(chave);
}

export function chaveDaUrl(url: string, bucket: string, regiao: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const hosts = new Set([
    `${bucket}.s3.${regiao}.amazonaws.com`,
    `${bucket}.s3.amazonaws.com`,
  ]);
  if (!hosts.has(parsed.hostname)) return null;
  const chave = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!chavePermitida(chave)) return null;
  return chave;
}

export function chaveDoDono(chave: string, grupo: GrupoArquivo, donoId: string): boolean {
  const dono = idDonoSeguro(donoId);
  if (!dono || !chavePermitida(chave)) return false;
  return chave.startsWith(`${grupo}/${dono}/`);
}

export function nomeDaUrl(url: string): string {
  try {
    const parte = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '');
    const semId = parte.replace(/^[0-9a-f-]{36}-/, '');
    return semId || parte || 'Arquivo';
  } catch {
    return 'Arquivo';
  }
}
