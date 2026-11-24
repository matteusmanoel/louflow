'use server';

import { criarAcao, MENSAGEM_SEM_PERMISSAO, MENSAGEM_SEM_SESSAO, type Resultado } from '@/lib/action';
import {
  defAgendarPublicacao,
  defCancelarPublicacao,
  defCriarPortfolio,
  defReiniciarPublicacao,
  defSalvarToken,
  defSincronizarPortfolio,
} from './acoes-def';
import { carregarPastaMidia, type VistaMidia } from './consultas';

export const criarPortfolioInstagram = criarAcao(defCriarPortfolio);
export const salvarTokenInstagram = criarAcao(defSalvarToken);
export const sincronizarPortfolioInstagram = criarAcao(defSincronizarPortfolio);
export const agendarPublicacaoInstagram = criarAcao(defAgendarPublicacao);
export const cancelarPublicacaoInstagram = criarAcao(defCancelarPublicacao);
export const reiniciarPublicacaoInstagram = criarAcao(defReiniciarPublicacao);

export async function listarPastaMidia(pastaId: string | null): Promise<Resultado<VistaMidia>> {
  const { obterSessao } = await import('@/lib/auth');
  const usuario = await obterSessao();
  if (!usuario) return { ok: false, mensagem: MENSAGEM_SEM_SESSAO };
  if (!usuario.permissoes.conectarInstagram) return { ok: false, mensagem: MENSAGEM_SEM_PERMISSAO };
  if (pastaId !== null && !/^[A-Za-z0-9_-]{2,40}$/.test(pastaId)) {
    return { ok: false, mensagem: 'Pasta inválida.' };
  }
  const dados = await carregarPastaMidia(usuario, pastaId);
  if (!dados) return { ok: false, mensagem: 'Pasta não encontrada.' };
  return { ok: true, mensagem: 'Pronto.', dados };
}
