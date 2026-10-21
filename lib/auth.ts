import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
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

/**
 * Exige Sessão válida em páginas. Sem Sessão, tenta o Dispositivo Confiável
 * (a rota de restauração grava o cookie) e, na falta dele, envia para o login.
 */
export async function exigirSessao(destino = '/'): Promise<UsuarioSessao> {
  const usuario = await obterSessao();
  if (usuario) return usuario;
  const jar = await cookies();
  const para = encodeURIComponent(destino);
  if (jar.get(COOKIE_DISPOSITIVO)?.value) redirect(`/api/sessao/restaurar?para=${para}`);
  redirect(`/login?para=${para}`);
}

/** Exige Sessão, PIN definitivo e acesso ao módulo. Sem acesso, redireciona com aviso. */
export async function exigirModulo(slug: string): Promise<UsuarioSessao> {
  const usuario = await exigirSessao(`/${slug}`);
  if (usuario.deveTrocarPin) redirect('/trocar-pin');
  const m = modulo(slug);
  if (!m || !m.permitido(usuario)) redirect(`${rotaInicial(usuario)}?aviso=sem-permissao`);
  return usuario;
}
