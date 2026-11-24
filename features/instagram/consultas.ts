import 'server-only';
import { abrirPasta, listarRaiz } from '@/features/drive/consultas';
import { db, type Db } from '@/lib/db';
import type { UsuarioSessao } from '@/lib/session';

export type StatusPortfolio = 'sem_token' | 'pendente' | 'autenticada' | 'erro';
export type StatusConta = 'ok' | 'erro' | 'ausente' | 'pendente';

export type ContaVisao = {
  id: string;
  username: string;
  nome: string | null;
  pageId: string;
  status: StatusConta;
  ultimoErro: string | null;
};

export type PortfolioVisao = {
  id: string;
  rotulo: string;
  status: StatusPortfolio;
  tokenConfigurado: boolean;
  tokenDica: string | null;
  nomeMeta: string | null;
  ultimoErro: string | null;
  sincronizadoEmTexto: string | null;
  contas: ContaVisao[];
};

export type PublicacaoVisao = {
  id: string;
  titulo: string;
  quandoTexto: string;
  status: string;
  username: string | null;
  formato: string | null;
  erro: string | null;
  tentativas: number;
};

const FUSO = 'America/Sao_Paulo';

function quando(data: Date | null): string | null {
  if (!data) return null;
  return data.toLocaleString('pt-BR', { timeZone: FUSO, dateStyle: 'short', timeStyle: 'short' });
}

type LinhaPortfolio = {
  id: string;
  label: string;
  status: StatusPortfolio;
  token_hint: string | null;
  token_ciphertext: Buffer | null;
  meta_user_name: string | null;
  last_error: string | null;
  last_sync_at: Date | null;
};

type LinhaConta = {
  id: string;
  portfolio_id: string;
  username: string;
  name: string | null;
  page_id: string;
  status: StatusConta;
  last_error: string | null;
};

export async function listarIntegracaoInstagram(sql: Db = db()): Promise<{
  portfolios: PortfolioVisao[];
  publicacoes: PublicacaoVisao[];
}> {
  const portfolios = await sql<LinhaPortfolio[]>`
    SELECT id, label, status, token_hint, token_ciphertext, meta_user_name, last_error, last_sync_at
    FROM meta_portfolios
    ORDER BY lower(label)`;
  const contas = await sql<LinhaConta[]>`
    SELECT id, portfolio_id, username, name, page_id, status, last_error
    FROM instagram_accounts
    ORDER BY lower(username)`;
  const publicacoes = await sql<{
    id: string;
    title: string;
    scheduled_at: Date;
    status: string;
    username: string | null;
    media_kind: string | null;
    publish_error: string | null;
    publish_attempts: number;
  }[]>`
    SELECT ps.id, ps.title, ps.scheduled_at, ps.status, ia.username, ps.media_kind,
           ps.publish_error, ps.publish_attempts
    FROM post_schedules ps
    LEFT JOIN instagram_accounts ia ON ia.id = ps.instagram_account_id
    WHERE ps.instagram_account_id IS NOT NULL
    ORDER BY ps.scheduled_at DESC
    LIMIT 40`;

  const porPortfolio = new Map<string, ContaVisao[]>();
  for (const conta of contas) {
    const lista = porPortfolio.get(conta.portfolio_id) ?? [];
    lista.push({
      id: conta.id,
      username: conta.username,
      nome: conta.name,
      pageId: conta.page_id,
      status: conta.status,
      ultimoErro: conta.last_error,
    });
    porPortfolio.set(conta.portfolio_id, lista);
  }

  return {
    portfolios: portfolios.map((portfolio) => ({
      id: portfolio.id,
      rotulo: portfolio.label,
      status: portfolio.status,
      tokenConfigurado: portfolio.token_ciphertext !== null,
      tokenDica: portfolio.token_hint,
      nomeMeta: portfolio.meta_user_name,
      ultimoErro: portfolio.last_error,
      sincronizadoEmTexto: quando(portfolio.last_sync_at),
      contas: porPortfolio.get(portfolio.id) ?? [],
    })),
    publicacoes: publicacoes.map((item) => ({
      id: item.id,
      titulo: item.title,
      quandoTexto: quando(item.scheduled_at) ?? '',
      status: item.status,
      username: item.username,
      formato: item.media_kind,
      erro: item.publish_error,
      tentativas: item.publish_attempts,
    })),
  };
}

export type ItemMidia = {
  id: string;
  nome: string;
  tipoItem: 'pasta' | 'arquivo';
  mime: string | null;
  tamanho: number | null;
};

export type VistaMidia = {
  nome: string;
  trilha: { id: string | null; nome: string }[];
  itens: ItemMidia[];
};

export async function listarContasAgendaveis(): Promise<{ id: string; username: string }[]> {
  return db()<{ id: string; username: string }[]>`
    SELECT id, username FROM instagram_accounts WHERE status = 'ok' ORDER BY username, id`;
}

/** Pastas e arquivos visíveis, sem URL. O agendamento resolve o arquivo no servidor. */
export async function carregarPastaMidia(usuario: UsuarioSessao, pastaId: string | null): Promise<VistaMidia | null> {
  const vista = pastaId ? await abrirPasta(usuario, pastaId) : await listarRaiz(usuario);
  if (!vista) return null;
  return {
    nome: vista.nome,
    trilha: vista.trilha.map((parte) => ({ id: parte.id, nome: parte.nome })),
    itens: vista.itens.map((item) => ({
      id: item.id,
      nome: item.nome,
      tipoItem: item.tipoItem,
      mime: item.mime,
      tamanho: item.tamanho,
    })),
  };
}
