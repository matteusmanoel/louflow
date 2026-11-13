/**
 * [PROTEGIDO] Destino interno após o login (parâmetro `para`).
 * Módulo puro, sem 'server-only': o proxy (edge), as páginas e as ações usam a mesma regra.
 * Só caminhos relativos do próprio app passam; qualquer outra coisa vira o padrão (anti open redirect).
 */

/** Cabeçalho com o destino da requisição, gravado pelo proxy. Nunca vem do navegador. */
export const CABECALHO_DESTINO = 'x-lf-destino';

const LIMITE = 2000;
const ORIGEM_FICTICIA = 'http://destino.invalido';
const CONTROLE = /[\u0000-\u001f\u007f\\]/;
/** Rotas que não fazem sentido como destino: laço de login e rotas de API. */
const PROIBIDOS = ['/login', '/api'];

function prefixo(caminho: string, base: string): boolean {
  return caminho === base || caminho.startsWith(`${base}/`) || caminho.startsWith(`${base}?`) || caminho.startsWith(`${base}#`);
}

/** Devolve o caminho se for interno e seguro; senão `padrao`. */
export function destinoInterno(valor: unknown, padrao = '/'): string {
  if (typeof valor !== 'string') return padrao;
  if (valor.length === 0 || valor.length > LIMITE) return padrao;
  if (!valor.startsWith('/') || valor.startsWith('//')) return padrao;
  if (CONTROLE.test(valor)) return padrao;
  let url: URL;
  try {
    url = new URL(valor, ORIGEM_FICTICIA);
  } catch {
    return padrao;
  }
  if (url.origin !== ORIGEM_FICTICIA) return padrao;
  if (PROIBIDOS.some((base) => prefixo(url.pathname, base))) return padrao;
  return valor;
}

/**
 * Destino final, depois do login e do PIN definitivo: nunca a própria troca de PIN.
 * Se o destino for `/trocar-pin?para=X`, vale o X (o destino sobrevive à troca).
 */
export function destinoFinal(valor: unknown): string {
  const destino = destinoInterno(valor);
  const url = new URL(destino, ORIGEM_FICTICIA);
  if (!prefixo(url.pathname, '/trocar-pin')) return destino;
  const aninhado = destinoInterno(url.searchParams.get('para'));
  return prefixo(new URL(aninhado, ORIGEM_FICTICIA).pathname, '/trocar-pin') ? '/' : aninhado;
}

/** Caminho da troca de PIN levando o destino original (omitido quando é a raiz ou inválido). */
export function caminhoTrocaPin(destino: unknown): string {
  const seguro = destinoFinal(destino);
  return seguro === '/' ? '/trocar-pin' : `/trocar-pin?para=${encodeURIComponent(seguro)}`;
}

/** Caminho do login levando o destino (omitido quando é a raiz ou inválido). */
export function caminhoLogin(destino: unknown): string {
  const seguro = destinoInterno(destino);
  return seguro === '/' ? '/login' : `/login?para=${encodeURIComponent(seguro)}`;
}
