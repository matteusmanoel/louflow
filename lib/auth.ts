import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { CABECALHO_DESTINO, caminhoLogin, caminhoTrocaPin, destinoInterno } from './destino';
import { env } from './env';
import { modulo, rotaInicial } from './modules';
import { DURACAO_DISPOSITIVO_MS, validarSessao, type UsuarioSessao } from './session';

/** [PROTEGIDO] Ligação da Sessão com cookies e rotas do Next. */

export const COOKIE_SESSAO = 'lf_sessao';
export const COOKIE_DISPOSITIVO = 'lf_dispositivo';

const base = () => ({ httpOnly: true, secure: env.producao, sameSite: 'lax' as const, path: '/' });

export async function gravarCookieSessao(token: string) {
  (await cookies()).set(COOKIE_SESSAO, token, base());
}

export async function gravarCookieDispositivo(token: string) {
  (await cookies()).set(COOKIE_DISPOSITIVO, token, { ...base(), maxAge: DURACAO_DISPOSITIVO_MS / 1000 });
}

export async function limparCookies() {
  const jar = await cookies();
  jar.delete(COOKIE_SESSAO);
  jar.delete(COOKIE_DISPOSITIVO);
}

/** Usuário da Sessão atual (memoizado por requisição), ou null. */
export const obterSessao = cache(async (): Promise<UsuarioSessao | null> => {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  return validarSessao(db(), token);
});

/** Destino da requisição atual, gravado pelo proxy (revalidado aqui). Sem ele, usa `padrao`. */
export async function destinoAtual(padrao = '/'): Promise<string> {
  const valor = (await headers()).get(CABECALHO_DESTINO);
  return valor ? destinoInterno(valor, padrao) : padrao;
}

/**
 * Exige Sessão válida em páginas. Sem Sessão, tenta o Dispositivo Confiável
 * (a rota de restauração grava o cookie) e, na falta dele, envia para o login.
 * O destino volta depois do login: o informado, ou o da requisição atual (cabeçalho do proxy).
 */
export async function exigirSessao(destino?: string): Promise<UsuarioSessao> {
  const usuario = await obterSessao();
  if (usuario) return usuario;
  const alvo = destinoInterno(destino ?? (await destinoAtual()));
  const jar = await cookies();
  if (jar.get(COOKIE_DISPOSITIVO)?.value) redirect(`/api/sessao/restaurar?para=${encodeURIComponent(alvo)}`);
  redirect(caminhoLogin(alvo));
}

/** Exige Sessão, PIN definitivo e acesso ao módulo. Sem acesso, redireciona com aviso. */
export async function exigirModulo(slug: string): Promise<UsuarioSessao> {
  const alvo = await destinoAtual(`/${slug}`);
  const usuario = await exigirSessao(alvo);
  if (usuario.deveTrocarPin) redirect(caminhoTrocaPin(alvo));
  const m = modulo(slug);
  if (!m || !m.permitido(usuario)) redirect(`${rotaInicial(usuario)}?aviso=sem-permissao`);
  return usuario;
}
