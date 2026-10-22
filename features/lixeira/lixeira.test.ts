import { describe, it, expect } from 'vitest';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { executarAcao } from '@/lib/action';
import type { UsuarioSessao } from '@/lib/session';
import type { ZodType } from 'zod';
import { resolverPermissoes } from '@/lib/permissions';
import { listarLixeira } from './consultas';
import { defRestaurarDemanda, defExcluirDefinitivamente } from './_acoes-def';

usarBancoLimpo();

function sessao(
  id: string,
  perfil: 'Administrador' | 'Editor' | 'Influencer' = 'Administrador',
  extras: Partial<UsuarioSessao['permissoes']> = {},
): UsuarioSessao {
  return {
    id,
    nome: 'Usuário Teste',
    perfil,
    editorLabel: perfil === 'Editor' ? 'Editor Teste' : null,
    deveTrocarPin: false,
    permissoes: { ...resolverPermissoes(perfil, []), ...extras },
    ehAprovadorDelegado: false,
  };
}

async function exec<Z extends ZodType, T>(
  def: import('@/lib/action').DefinicaoAcao<Z, T>,
  entrada: unknown,
  usuario: UsuarioSessao,
) {
  return executarAcao(def, entrada, {
    obterUsuario: async () => usuario,
    sql: sqlTeste,
  });
}

async function criarDemandaNaLixeira(usuarioId: string): Promise<string> {
  const sql = sqlTeste();
  const id = 'LF' + Math.random().toString(16).slice(2, 12).toUpperCase();
  await sql`
    INSERT INTO demands (id, title, format, status, deleted_at)
    VALUES (${id}, 'Demanda para lixeira', 'Vídeo', 'Não iniciada', now())
  `;
  await sql`
    INSERT INTO demand_trash (demand_id, deleted_by)
    VALUES (${id}, ${usuarioId})
  `;
  return id;
}

async function criarDemandaAtiva(): Promise<string> {
  const sql = sqlTeste();
  const id = 'LF' + Math.random().toString(16).slice(2, 12).toUpperCase();
  await sql`
    INSERT INTO demands (id, title, format, status)
    VALUES (${id}, 'Demanda ativa', 'Vídeo', 'Não iniciada')
  `;
  return id;
}

// ---------------------------------------------------------------------------
// listarLixeira
// ---------------------------------------------------------------------------
describe('listarLixeira', () => {
  it('retorna demandas com deleted_at', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemandaNaLixeira(uid);

    const lista = await listarLixeira();
    expect(lista.some((d) => d.id === demandaId)).toBe(true);
  });

  it('não retorna demandas ativas', async () => {
    const id = await criarDemandaAtiva();
    const lista = await listarLixeira();
    expect(lista.some((d) => d.id === id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// restaurarDemanda
// ---------------------------------------------------------------------------
describe('restaurarDemanda', () => {
  it('restaura demanda da lixeira', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemandaNaLixeira(uid);
    const u = sessao(uid);

    const res = await exec(defRestaurarDemanda, { demandaId }, u);
    expect(res.ok).toBe(true);

    const sql = sqlTeste();
    const [d] = await sql<{ deleted_at: Date | null }[]>`
      SELECT deleted_at FROM demands WHERE id = ${demandaId}
    `;
    expect(d?.deleted_at).toBeNull();

    const [trash] = await sql<{ demand_id: string }[]>`
      SELECT demand_id FROM demand_trash WHERE demand_id = ${demandaId}
    `;
    expect(trash).toBeUndefined();
  });

  it('falha ao restaurar demanda que não está na lixeira', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemandaAtiva();
    const u = sessao(uid);

    const res = await exec(defRestaurarDemanda, { demandaId }, u);
    expect(res.ok).toBe(false);
    expect(res.mensagem).toContain('lixeira');
  });

  it('recusa usuário sem permissão', async () => {
    const { id: uid } = await criarUsuario({ perfil: 'Influencer' });
    const { id: adminId } = await criarUsuario();
    const demandaId = await criarDemandaNaLixeira(adminId);
    const u = sessao(uid, 'Influencer');

    const res = await exec(defRestaurarDemanda, { demandaId }, u);
    expect(res.ok).toBe(false);
    expect(res.mensagem).toContain('permissão');
  });

  it('registra histórico e auditoria após restaurar', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemandaNaLixeira(uid);
    const u = sessao(uid);

    await exec(defRestaurarDemanda, { demandaId }, u);

    const sql = sqlTeste();
    const [hist] = await sql<{ action: string }[]>`
      SELECT action FROM history WHERE demand_id = ${demandaId} ORDER BY id DESC LIMIT 1
    `;
    expect(hist?.action).toContain('Restaurada');

    const [audit] = await sql<{ action: string }[]>`
      SELECT action FROM audit_log WHERE target = ${demandaId} ORDER BY id DESC LIMIT 1
    `;
    expect(audit?.action).toBe('restaurar_demanda');
  });
});

// ---------------------------------------------------------------------------
// excluirDefinitivamente
// ---------------------------------------------------------------------------
describe('excluirDefinitivamente', () => {
  it('exclui definitivamente demanda da lixeira', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemandaNaLixeira(uid);
    const u = sessao(uid);

    const res = await exec(defExcluirDefinitivamente, { demandaId }, u);
    expect(res.ok).toBe(true);

    const sql = sqlTeste();
    const [d] = await sql<{ id: string }[]>`SELECT id FROM demands WHERE id = ${demandaId}`;
    expect(d).toBeUndefined();
  });

  it('falha ao excluir definitivamente demanda ativa', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemandaAtiva();
    const u = sessao(uid);

    const res = await exec(defExcluirDefinitivamente, { demandaId }, u);
    expect(res.ok).toBe(false);
    expect(res.mensagem).toContain('lixeira');
  });

  it('recusa Editor sem gerenciarUsuarios', async () => {
    const { id: adminId } = await criarUsuario();
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemandaNaLixeira(adminId);
    const u = sessao(editorId, 'Editor');

    const res = await exec(defExcluirDefinitivamente, { demandaId }, u);
    expect(res.ok).toBe(false);
    expect(res.mensagem).toContain('permissão');
  });

  it('registra auditoria antes de excluir', async () => {
    const { id: uid } = await criarUsuario();
    const demandaId = await criarDemandaNaLixeira(uid);
    const u = sessao(uid);

    await exec(defExcluirDefinitivamente, { demandaId }, u);

    const sql = sqlTeste();
    const [audit] = await sql<{ action: string }[]>`
      SELECT action FROM audit_log WHERE target = ${demandaId} ORDER BY id DESC LIMIT 1
    `;
    expect(audit?.action).toBe('excluir_definitivamente');
  });
});
