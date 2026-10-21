import { describe, expect, it } from 'vitest';
import {
  autenticar,
  BLOQUEIO_MS,
  criarDispositivoConfiavel,
  criarSessao,
  definirPinProvisorio,
  DURACAO_SESSAO_MS,
  invalidarAcessos,
  LIMITE_TENTATIVAS,
  trocarPinProprio,
  usuarioDoDispositivo,
  validarSessao,
} from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from './helpers/db';

usarBancoLimpo();

const PIN = '482916';
const depois = (base: Date, ms: number) => new Date(base.getTime() + ms);

describe('autenticação', () => {
  it('aceita PIN correto e informa troca obrigatória', async () => {
    const u = await criarUsuario({ deveTrocarPin: true });
    expect(await autenticar(sqlTeste(), u.email, PIN)).toEqual({ ok: true, userId: u.id, deveTrocarPin: true });
  });

  it('não distingue e-mail inexistente, PIN errado, inativo ou sem PIN', async () => {
    const inativo = await criarUsuario({ ativo: false });
    const semPin = await criarUsuario({ pin: null });
    const ativo = await criarUsuario();
    const sql = sqlTeste();
    for (const r of [
      await autenticar(sql, 'ninguem@exemplo.test', PIN),
      await autenticar(sql, ativo.email, '000000'),
      await autenticar(sql, inativo.email, PIN),
      await autenticar(sql, semPin.email, PIN),
    ]) expect(r).toEqual({ ok: false, motivo: 'invalido' });
  });

  it(`bloqueia após ${LIMITE_TENTATIVAS} falhas e libera depois do prazo`, async () => {
    const u = await criarUsuario();
    const sql = sqlTeste();
    const t0 = new Date();
    for (let i = 1; i < LIMITE_TENTATIVAS; i++) {
      expect((await autenticar(sql, u.email, '000000', t0)).ok).toBe(false);
    }
    const quinta = await autenticar(sql, u.email, '000000', t0);
    expect(quinta).toMatchObject({ ok: false, motivo: 'bloqueado' });

    expect(await autenticar(sql, u.email, PIN, depois(t0, 60_000))).toMatchObject({ motivo: 'bloqueado' });
    expect(await autenticar(sql, u.email, PIN, depois(t0, BLOQUEIO_MS + 1000))).toMatchObject({ ok: true });
  });
});

describe('Sessão', () => {
  it('expira após 6 h sem uso e desliza a cada uso', async () => {
    const u = await criarUsuario();
    const sql = sqlTeste();
    const t0 = new Date();
    const token = await criarSessao(sql, u.id, t0);

    const t1 = depois(t0, DURACAO_SESSAO_MS - 60_000);
    expect(await validarSessao(sql, token, t1)).toMatchObject({ id: u.id });
    expect(await validarSessao(sql, token, depois(t1, DURACAO_SESSAO_MS - 60_000))).toMatchObject({ id: u.id });

    const token2 = await criarSessao(sql, u.id, t0);
    expect(await validarSessao(sql, token2, depois(t0, DURACAO_SESSAO_MS + 1000))).toBeNull();
  });

  it('a base guarda só o digest do token', async () => {
    const u = await criarUsuario();
    const token = await criarSessao(sqlTeste(), u.id);
    const linhas = await sqlTeste()`SELECT token_digest FROM session_tokens`;
    expect(linhas[0]?.token_digest).not.toBe(token);
  });

  it('invalidação de acesso derruba Sessão e Dispositivo Confiável', async () => {
    const u = await criarUsuario();
    const sql = sqlTeste();
    const sessao = await criarSessao(sql, u.id);
    const dispositivo = await criarDispositivoConfiavel(sql, u.id);
    expect(await usuarioDoDispositivo(sql, dispositivo)).toBe(u.id);

    await invalidarAcessos(sql, u.id);
    expect(await validarSessao(sql, sessao)).toBeNull();
    expect(await usuarioDoDispositivo(sql, dispositivo)).toBeNull();
  });

  it('desligar o Usuário invalida a Sessão mesmo sem apagar o token', async () => {
    const u = await criarUsuario();
    const sql = sqlTeste();
    const sessao = await criarSessao(sql, u.id);
    await sql`UPDATE users SET is_active = false WHERE id = ${u.id}`;
    expect(await validarSessao(sql, sessao)).toBeNull();
  });
});

describe('PIN', () => {
  it('PIN provisório obriga troca e invalida acessos anteriores', async () => {
    const u = await criarUsuario();
    const sql = sqlTeste();
    const antiga = await criarSessao(sql, u.id);
    const provisorio = await definirPinProvisorio(sql, u.id);
    expect(provisorio).toMatch(/^\d{6}$/);
    expect(await validarSessao(sql, antiga)).toBeNull();
    expect(await autenticar(sql, u.email, provisorio)).toMatchObject({ ok: true, deveTrocarPin: true });
  });

  it('troca de PIN libera o uso e o PIN antigo deixa de valer', async () => {
    const u = await criarUsuario({ deveTrocarPin: true });
    const sql = sqlTeste();
    await trocarPinProprio(sql, u.id, '730514');
    expect(await autenticar(sql, u.email, PIN)).toMatchObject({ ok: false });
    expect(await autenticar(sql, u.email, '730514')).toMatchObject({ ok: true, deveTrocarPin: false });
  });
});
