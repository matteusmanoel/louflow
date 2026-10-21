import 'server-only';
import type { Db } from './db';
import { digestToken, tokenAleatorio } from './crypto';
import { conferirPin, gerarHashPin, gerarPinProvisorio } from './pin';
import { ehChavePermissao, resolverPermissoes, type ConcessaoIndividual, type Perfil, type Permissoes } from './permissions';

/** [PROTEGIDO] Sessão, Dispositivo Confiável, bloqueio de login e invalidação de acesso. */

export const DURACAO_SESSAO_MS = 6 * 60 * 60 * 1000;
export const DURACAO_DISPOSITIVO_MS = 30 * 24 * 60 * 60 * 1000;
export const LIMITE_TENTATIVAS = 5;
export const BLOQUEIO_MS = 15 * 60 * 1000;

export type UsuarioSessao = {
  id: string;
  nome: string;
  perfil: Perfil;
  editorLabel: string | null;
  deveTrocarPin: boolean;
  permissoes: Permissoes;
  ehAprovadorDelegado: boolean;
};

type LinhaUsuario = {
  id: string;
  name: string;
  profile: Perfil;
  editor_label: string | null;
  must_reset_pin: boolean;
};

const somar = (agora: Date, ms: number) => new Date(agora.getTime() + ms);

export async function carregarUsuarioSessao(sql: Db, linha: LinhaUsuario): Promise<UsuarioSessao> {
  const [concessoes, delegacoes] = await Promise.all([
    sql<{ permission_key: string; granted: boolean }[]>`
      SELECT permission_key, granted FROM user_permissions WHERE user_id = ${linha.id}`,
    sql<{ existe: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM approval_delegations WHERE approver_id = ${linha.id}) AS existe`,
  ]);
  const lista: ConcessaoIndividual[] = concessoes
    .filter((c) => ehChavePermissao(c.permission_key))
    .map((c) => ({ chave: c.permission_key as ConcessaoIndividual['chave'], concedida: c.granted }));

  return {
    id: linha.id,
    nome: linha.name,
    perfil: linha.profile,
    editorLabel: linha.editor_label,
    deveTrocarPin: linha.must_reset_pin,
    permissoes: resolverPermissoes(linha.profile, lista),
    ehAprovadorDelegado: delegacoes[0]?.existe ?? false,
  };
}

export async function criarSessao(sql: Db, userId: string, agora = new Date()): Promise<string> {
  const token = tokenAleatorio();
  await sql`
    INSERT INTO session_tokens (token_digest, user_id, access_version, expires_at)
    SELECT ${digestToken(token)}, id, access_version, ${somar(agora, DURACAO_SESSAO_MS)}
    FROM users WHERE id = ${userId}`;
  return token;
}

/** Valida a Sessão e renova a expiração (deslizante). Versão de acesso divergente = Sessão inválida. */
export async function validarSessao(sql: Db, token: string, agora = new Date()): Promise<UsuarioSessao | null> {
  const linhas = await sql<LinhaUsuario[]>`
    WITH s AS (
      UPDATE session_tokens
         SET expires_at = ${somar(agora, DURACAO_SESSAO_MS)}
       WHERE token_digest = ${digestToken(token)} AND expires_at > ${agora}
      RETURNING user_id, access_version
    )
    SELECT u.id, u.name, u.profile, u.editor_label, u.must_reset_pin
      FROM s JOIN users u ON u.id = s.user_id
     WHERE u.access_version = s.access_version AND u.is_active`;
  const linha = linhas[0];
  return linha ? carregarUsuarioSessao(sql, linha) : null;
}

export async function encerrarSessao(sql: Db, token: string): Promise<void> {
  await sql`DELETE FROM session_tokens WHERE token_digest = ${digestToken(token)}`;
}

export async function criarDispositivoConfiavel(sql: Db, userId: string, agora = new Date()): Promise<string> {
  const token = tokenAleatorio();
  await sql`
    INSERT INTO trusted_devices (token_digest, user_id, access_version, expires_at)
    SELECT ${digestToken(token)}, id, access_version, ${somar(agora, DURACAO_DISPOSITIVO_MS)}
    FROM users WHERE id = ${userId}`;
  return token;
}

/** Retorna o Usuário do Dispositivo Confiável ainda válido, ou null. */
export async function usuarioDoDispositivo(sql: Db, token: string, agora = new Date()): Promise<string | null> {
  const linhas = await sql<{ user_id: string }[]>`
    UPDATE trusted_devices d SET last_used_at = ${agora}
      FROM users u
     WHERE d.token_digest = ${digestToken(token)} AND d.expires_at > ${agora}
       AND u.id = d.user_id AND u.access_version = d.access_version AND u.is_active
    RETURNING d.user_id`;
  return linhas[0]?.user_id ?? null;
}

export async function esquecerDispositivo(sql: Db, token: string): Promise<void> {
  await sql`DELETE FROM trusted_devices WHERE token_digest = ${digestToken(token)}`;
}

/**
 * Encerra todas as Sessões e Dispositivos Confiáveis do Usuário.
 * Obrigatório na mesma transação de qualquer mudança de Perfil, Permissões, PIN ou desligamento.
 */
export async function invalidarAcessos(sql: Db, userId: string): Promise<void> {
  await sql`UPDATE users SET access_version = access_version + 1, updated_at = now() WHERE id = ${userId}`;
  await sql`DELETE FROM session_tokens WHERE user_id = ${userId}`;
  await sql`DELETE FROM trusted_devices WHERE user_id = ${userId}`;
}

export type ResultadoAutenticacao =
  | { ok: true; userId: string; deveTrocarPin: boolean }
  | { ok: false; motivo: 'invalido' }
  | { ok: false; motivo: 'bloqueado'; liberaEm: Date };

/** Confere e-mail + PIN aplicando o bloqueio de 5 tentativas por 15 min. Não cria Sessão. */
export async function autenticar(sql: Db, email: string, pin: string, agora = new Date()): Promise<ResultadoAutenticacao> {
  const [u] = await sql<{ id: string; pin_hash: string | null; is_active: boolean; must_reset_pin: boolean; locked_until: Date | null }[]>`
    SELECT id, pin_hash, is_active, must_reset_pin, locked_until FROM users WHERE email = ${email.trim()}`;

  if (u?.locked_until && u.locked_until > agora) {
    return { ok: false, motivo: 'bloqueado', liberaEm: u.locked_until };
  }

  const confere = await conferirPin(pin, u?.is_active ? u.pin_hash : null);
  if (!u) return { ok: false, motivo: 'invalido' };

  if (!confere) {
    const [r] = await sql<{ locked_until: Date | null }[]>`
      UPDATE users SET
        failed_logins = CASE WHEN failed_logins + 1 >= ${LIMITE_TENTATIVAS} THEN 0 ELSE failed_logins + 1 END,
        locked_until  = CASE WHEN failed_logins + 1 >= ${LIMITE_TENTATIVAS} THEN ${somar(agora, BLOQUEIO_MS)} ELSE NULL END
      WHERE id = ${u.id}
      RETURNING locked_until`;
    if (r?.locked_until) return { ok: false, motivo: 'bloqueado', liberaEm: r.locked_until };
    return { ok: false, motivo: 'invalido' };
  }

  await sql`UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ${u.id}`;
  return { ok: true, userId: u.id, deveTrocarPin: u.must_reset_pin };
}

/** Define um PIN provisório (P1): retorna o PIN para exibição única e obriga a troca no próximo login. */
export async function definirPinProvisorio(sql: Db, userId: string): Promise<string> {
  const pin = gerarPinProvisorio();
  await sql`
    UPDATE users SET pin_hash = ${await gerarHashPin(pin)}, must_reset_pin = true,
      failed_logins = 0, locked_until = NULL, updated_at = now()
    WHERE id = ${userId}`;
  await invalidarAcessos(sql, userId);
  return pin;
}

/** Troca do PIN pelo próprio Usuário. Invalida os demais acessos; o chamador cria a nova Sessão. */
export async function trocarPinProprio(sql: Db, userId: string, novoPin: string): Promise<void> {
  await sql`
    UPDATE users SET pin_hash = ${await gerarHashPin(novoPin)}, must_reset_pin = false, updated_at = now()
    WHERE id = ${userId}`;
  await invalidarAcessos(sql, userId);
}
