import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { executarAcao, MENSAGEM_ERRO_INESPERADO, MENSAGEM_SEM_PERMISSAO, MENSAGEM_SEM_SESSAO, type DefinicaoAcao } from '@/lib/action';
import { registrarAuditoria } from '@/lib/audit';
import { ErroDominio } from '@/lib/errors';
import { registrarHistorico } from '@/lib/history';
import { registrarEnviador, type Notificacao } from '@/lib/notify';
import { resolverPermissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from './helpers/db';

usarBancoLimpo();
afterEach(() => registrarEnviador(null));

const sessaoDe = (id: string, perfil: UsuarioSessao['perfil'] = 'Administrador', deveTrocarPin = false): UsuarioSessao => ({
  id, nome: 'Teste', perfil, editorLabel: null, deveTrocarPin, permissoes: resolverPermissoes(perfil, []), ehAprovadorDelegado: false,
});

const notificacao: Notificacao = { tipo: 'status_alterado', destinatarios: ['x'], assunto: 'a', texto: 't' };

function acao(executar: DefinicaoAcao<z.ZodObject<{ texto: z.ZodString }>, string>['executar']) {
  return {
    nome: 'teste',
    schema: z.object({ texto: z.string().min(1, 'Informe o texto.') }),
    permissao: 'gerenciarUsuarios' as const,
    executar,
  };
}

async function contar(tabela: 'history' | 'audit_log' | 'error_log') {
  const [r] = await sqlTeste().unsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM ${tabela}`);
  return r!.n;
}

describe('executarAcao', () => {
  it('sem Sessão: não valida nem abre transação', async () => {
    const executar = vi.fn();
    const r = await executarAcao(acao(executar), { texto: 'x' }, { obterUsuario: async () => null, sql: sqlTeste });
    expect(r).toEqual({ ok: false, mensagem: MENSAGEM_SEM_SESSAO });
    expect(executar).not.toHaveBeenCalled();
  });

  it('PIN provisório bloqueia ações comuns', async () => {
    const u = await criarUsuario();
    const executar = vi.fn();
    const r = await executarAcao(acao(executar), { texto: 'x' }, { obterUsuario: async () => sessaoDe(u.id, 'Administrador', true), sql: sqlTeste });
    expect(r.ok).toBe(false);
    expect(executar).not.toHaveBeenCalled();
  });

  it('entrada inválida devolve a mensagem do schema', async () => {
    const u = await criarUsuario();
    const r = await executarAcao(acao(vi.fn()), { texto: '' }, { obterUsuario: async () => sessaoDe(u.id), sql: sqlTeste });
    expect(r).toEqual({ ok: false, mensagem: 'Informe o texto.' });
  });

  it('sem Permissão: recusa antes da transação', async () => {
    const u = await criarUsuario({ perfil: 'Editor' });
    const executar = vi.fn();
    const r = await executarAcao(acao(executar), { texto: 'x' }, { obterUsuario: async () => sessaoDe(u.id, 'Editor'), sql: sqlTeste });
    expect(r).toEqual({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
    expect(executar).not.toHaveBeenCalled();
  });

  it('sucesso: grava Histórico e Auditoria e notifica só depois do commit', async () => {
    const u = await criarUsuario();
    const enviados: number[] = [];
    registrarEnviador(async (sql) => {
      const [r] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM history`;
      enviados.push(r!.n);
    });
    const r = await executarAcao(
      acao(async ({ tx, usuario, entrada, notificar }) => {
        await registrarHistorico(tx, { demandaId: null, acao: 'teste', usuarioId: usuario.id, detalhes: entrada.texto });
        await registrarAuditoria(tx, { acao: 'teste', usuarioId: usuario.id, alvo: 'x', depois: { pin: '1', nome: 'n' } });
        notificar(notificacao);
        return { dados: 'feito' };
      }),
      { texto: 'x' },
      { obterUsuario: async () => sessaoDe(u.id), sql: sqlTeste },
    );
    expect(r).toMatchObject({ ok: true, dados: 'feito' });
    expect(enviados).toEqual([1]);
    const [audit] = await sqlTeste()`SELECT after FROM audit_log`;
    expect(String(audit?.after)).not.toContain('"pin"');
  });

  it('erro de domínio desfaz tudo e não notifica', async () => {
    const u = await criarUsuario();
    const enviar = vi.fn();
    registrarEnviador(enviar);
    const r = await executarAcao(
      acao(async ({ tx, usuario, notificar }) => {
        await registrarHistorico(tx, { demandaId: null, acao: 'teste', usuarioId: usuario.id });
        notificar(notificacao);
        throw new ErroDominio('Regra violada.');
      }),
      { texto: 'x' },
      { obterUsuario: async () => sessaoDe(u.id), sql: sqlTeste },
    );
    expect(r).toEqual({ ok: false, mensagem: 'Regra violada.' });
    expect(await contar('history')).toBe(0);
    expect(enviar).not.toHaveBeenCalled();
  });

  it('erro inesperado vira mensagem genérica e é registrado sem dado pessoal', async () => {
    const u = await criarUsuario();
    const r = await executarAcao(
      acao(async () => {
        throw new Error('falhou para fulano@exemplo.test');
      }),
      { texto: 'x' },
      { obterUsuario: async () => sessaoDe(u.id), sql: sqlTeste },
    );
    expect(r).toEqual({ ok: false, mensagem: MENSAGEM_ERRO_INESPERADO });
    const [log] = await sqlTeste()`SELECT message FROM error_log`;
    expect(String(log?.message)).not.toContain('fulano@exemplo.test');
  });

  it('violação de restrição mapeada vira mensagem amigável', async () => {
    const u = await criarUsuario();
    const r = await executarAcao(
      {
        ...acao(async ({ tx, usuario }) => {
          const t = (h: number) => new Date(Date.UTC(2026, 10, 10, h));
          await tx`INSERT INTO media_reservations (id, starts_at, ends_at, reason, reserved_by) VALUES ('R1', ${t(8)}, ${t(10)}, 'a', ${usuario.id})`;
          await tx`INSERT INTO media_reservations (id, starts_at, ends_at, reason, reserved_by) VALUES ('R2', ${t(9)}, ${t(11)}, 'a', ${usuario.id})`;
          return { dados: 'x' };
        }),
        restricoes: { media_reservations_tstzrange_excl: 'Horário já reservado.' },
      },
      { texto: 'x' },
      { obterUsuario: async () => sessaoDe(u.id), sql: sqlTeste },
    );
    expect(r).toEqual({ ok: false, mensagem: 'Horário já reservado.' });
  });

  it('falha no envio da notificação não altera o resultado', async () => {
    const u = await criarUsuario();
    registrarEnviador(async () => {
      throw new Error('provedor fora');
    });
    const r = await executarAcao(
      acao(async ({ notificar }) => {
        notificar(notificacao);
        return { dados: 'ok' };
      }),
      { texto: 'x' },
      { obterUsuario: async () => sessaoDe(u.id), sql: sqlTeste },
    );
    expect(r.ok).toBe(true);
    expect(await contar('error_log')).toBe(1);
  });
});
