import 'server-only';

const VERSAO = 'v24.0';
const BASE = `https://graph.facebook.com/${VERSAO}`;
const CAMPOS_PAGINA = 'id,name,instagram_business_account{id,username,name}';

export class ErroMeta extends Error {
  readonly tentarDeNovo: boolean;
  readonly containerId: string | null;
  readonly limparContainer: boolean;

  constructor(
    mensagem: string,
    opcoes: { tentarDeNovo?: boolean; containerId?: string | null; limparContainer?: boolean } = {},
  ) {
    super(mensagem);
    this.name = 'ErroMeta';
    this.tentarDeNovo = opcoes.tentarDeNovo ?? false;
    this.containerId = opcoes.containerId ?? null;
    this.limparContainer = opcoes.limparContainer ?? false;
  }
}

export type ContaDescoberta = {
  igUserId: string;
  pageId: string;
  username: string;
  nome: string | null;
  acessivel: boolean;
  erro: string | null;
};

export type ResultadoSincronizacao = {
  metaUserId: string;
  metaUserName: string;
  contas: ContaDescoberta[];
};

export type FormatoPublicacao = 'imagem' | 'reel' | 'story';

export type PedidoContainer = {
  igUserId: string;
  formato: FormatoPublicacao;
  legenda: string;
  midiaUrl: string;
};

export type ClienteMeta = {
  sincronizar(token: string): Promise<ResultadoSincronizacao>;
  criarContainer(token: string, pedido: PedidoContainer): Promise<{ containerId: string }>;
  publicarContainer(token: string, igUserId: string, containerId: string): Promise<{ igMediaId: string }>;
};

/** Remove o token se a Meta o ecoar na mensagem. */
export function mensagemPublica(texto: string, token?: string): string {
  let limpo = texto;
  if (token && token.length > 0) limpo = limpo.split(token).join('[token]');
  limpo = limpo.replace(/EAA[A-Za-z0-9]+/g, '[token]');
  limpo = limpo.replace(/access_token=[^&\s]+/gi, 'access_token=[token]');
  return limpo.replace(/\s+/g, ' ').trim().slice(0, 300);
}

type PaginaMeta = {
  id?: string;
  name?: string;
  instagram_business_account?: { id?: string; username?: string; name?: string };
};

type RespostaLista = { data?: PaginaMeta[]; paging?: { next?: string } };
type RespostaErro = { error?: { message?: string } };

function urlSegura(valor: string): URL | null {
  try {
    const url = new URL(valor);
    if (url.protocol !== 'https:' || url.hostname !== 'graph.facebook.com') return null;
    return url;
  } catch {
    return null;
  }
}

async function pedir<T>(token: string, caminho: string, metodo: 'GET' | 'POST' = 'GET', corpo?: URLSearchParams): Promise<T> {
  const url = caminho.startsWith('https://') ? urlSegura(caminho) : new URL(`${BASE}${caminho}`);
  if (!url) throw new ErroMeta('A Meta devolveu um endereço inesperado.');

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(corpo ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: corpo,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ErroMeta('Não foi possível falar com a Meta. Tente de novo em instantes.', { tentarDeNovo: true });
  }

  const json = (await resposta.json().catch(() => ({}))) as T & RespostaErro;
  if (!resposta.ok || json.error) {
    const bruto = json.error?.message ?? `A Meta recusou a chamada (${resposta.status}).`;
    const mensagem = mensagemPublica(bruto, token);
    const baixo = mensagem.toLowerCase();
    const processando = /not ready|in progress|media id is not available/.test(baixo);
    const expirou = /expir/.test(baixo);
    throw new ErroMeta(mensagem || 'A Meta recusou a chamada.', {
      tentarDeNovo: processando,
      limparContainer: expirou,
    });
  }
  return json;
}

async function listar(token: string, caminho: string): Promise<PaginaMeta[]> {
  const todas: PaginaMeta[] = [];
  let proximo: string | null = caminho;
  for (let i = 0; i < 10 && proximo; i += 1) {
    const pagina: RespostaLista = await pedir<RespostaLista>(token, proximo);
    todas.push(...(pagina.data ?? []));
    proximo = pagina.paging?.next ?? null;
  }
  return todas;
}

function juntar(paginas: PaginaMeta[]): ContaDescoberta[] {
  const porIg = new Map<string, ContaDescoberta>();
  for (const pagina of paginas) {
    const ig = pagina.instagram_business_account;
    if (!pagina.id || !ig?.id) continue;
    porIg.set(ig.id, {
      igUserId: ig.id,
      pageId: pagina.id,
      username: ig.username?.replace(/^@/, '') || ig.id,
      nome: ig.name ?? pagina.name ?? null,
      acessivel: false,
      erro: null,
    });
  }
  return [...porIg.values()];
}

function ehVideo(url: string): boolean {
  try {
    return /\.(mp4|mov|webm)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

const clienteGraph: ClienteMeta = {
  async sincronizar(token) {
    const eu = await pedir<{ id?: string; name?: string }>(token, '/me?fields=id,name');
    if (!eu.id) throw new ErroMeta('A Meta não identificou o usuário do sistema.');

    const proprias = await listar(token, `/me/accounts?fields=${CAMPOS_PAGINA}&limit=100`);
    let atribuidas: PaginaMeta[] = [];
    try {
      atribuidas = await listar(token, `/${eu.id}/assigned_pages?fields=${CAMPOS_PAGINA}&limit=100`);
    } catch {
      atribuidas = [];
    }

    const contas = juntar([...proprias, ...atribuidas]);
    for (const conta of contas) {
      try {
        await pedir(token, `/${conta.igUserId}?fields=id,username`);
        conta.acessivel = true;
      } catch (erro) {
        conta.acessivel = false;
        conta.erro = erro instanceof ErroMeta ? erro.message : 'Não foi possível ler a conta.';
      }
    }

    return { metaUserId: eu.id, metaUserName: eu.name ?? 'Business Manager', contas };
  },

  async criarContainer(token, pedido) {
    const corpo = new URLSearchParams();
    const video = ehVideo(pedido.midiaUrl);
    if (pedido.formato === 'imagem') {
      corpo.set('image_url', pedido.midiaUrl);
      corpo.set('caption', pedido.legenda);
    } else if (pedido.formato === 'reel') {
      corpo.set('media_type', 'REELS');
      corpo.set('video_url', pedido.midiaUrl);
      corpo.set('caption', pedido.legenda);
      corpo.set('share_to_feed', 'true');
    } else {
      corpo.set('media_type', 'STORIES');
      corpo.set(video ? 'video_url' : 'image_url', pedido.midiaUrl);
    }

    const criado = await pedir<{ id?: string }>(token, `/${pedido.igUserId}/media`, 'POST', corpo);
    if (!criado.id) throw new ErroMeta('A Meta não devolveu o material.');

    const estado = await pedir<{ status_code?: string }>(token, `/${criado.id}?fields=status_code`);
    if (estado.status_code === 'ERROR') {
      throw new ErroMeta('A Meta rejeitou o material. Confira o formato do arquivo.', { containerId: criado.id });
    }
    if (estado.status_code === 'EXPIRED') {
      throw new ErroMeta('O material expirou na Meta.', { limparContainer: true, tentarDeNovo: true });
    }
    if (estado.status_code === 'IN_PROGRESS') {
      throw new ErroMeta('O vídeo ainda está processando.', { tentarDeNovo: true, containerId: criado.id });
    }
    return { containerId: criado.id };
  },

  async publicarContainer(token, igUserId, containerId) {
    const corpo = new URLSearchParams({ creation_id: containerId });
    try {
      const publicado = await pedir<{ id?: string }>(token, `/${igUserId}/media_publish`, 'POST', corpo);
      if (!publicado.id) throw new ErroMeta('A Meta não confirmou a publicação.', { tentarDeNovo: true, containerId });
      return { igMediaId: publicado.id };
    } catch (erro) {
      if (erro instanceof ErroMeta && !erro.containerId && !erro.limparContainer) {
        throw new ErroMeta(erro.message, { tentarDeNovo: erro.tentarDeNovo, containerId, limparContainer: erro.limparContainer });
      }
      throw erro;
    }
  },
};

let clienteAtual: ClienteMeta | null = null;

export function definirClienteMeta(cliente: ClienteMeta | null) {
  clienteAtual = cliente;
}

export function clienteMeta(): ClienteMeta {
  return clienteAtual ?? clienteGraph;
}
