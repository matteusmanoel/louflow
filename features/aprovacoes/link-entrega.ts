/**
 * Link da Entrega exibido no cartão de aprovação. Só http(s) vira link clicável:
 * o endereço vem do Editor e não pode abrir `javascript:`, `data:` ou similares.
 */
export type LinkEntrega = { href: string; rotulo: string };

const LIMITE_ROTULO = 60;

export function descreverLinkEntrega(valor: string | null | undefined): LinkEntrega | null {
  const texto = valor?.trim();
  if (!texto) return null;
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const caminho = url.pathname === '/' ? '' : url.pathname;
  const completo = `${url.hostname.replace(/^www\./, '')}${caminho}`;
  const rotulo = completo.length > LIMITE_ROTULO ? `${completo.slice(0, LIMITE_ROTULO - 1)}…` : completo;
  return { href: url.toString(), rotulo };
}

/**
 * Sem link extra quando a Entrega já mostra o arquivo enviado (o link é o próprio arquivo).
 * `acessivel` é o endereço usável no navegador (assinado, quando o link aponta para o bucket).
 */
export function linkParaCartao(link: string, urlsDosArquivos: readonly string[], acessivel: string = link): LinkEntrega | null {
  if (urlsDosArquivos.includes(link)) return null;
  return descreverLinkEntrega(acessivel);
}
