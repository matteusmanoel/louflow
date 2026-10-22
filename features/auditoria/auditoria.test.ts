import { describe, it, expect } from 'vitest';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { listarAuditoria } from './consultas';

usarBancoLimpo();

async function inserirAuditoria(
  sql: ReturnType<typeof sqlTeste>,
  userId: string | null,
  acao: string,
  alvo?: string,
) {
  await sql`
    INSERT INTO audit_log (action, user_id, target, details)
    VALUES (${acao}, ${userId}::uuid, ${alvo ?? null}, 'detalhe de teste')
  `;
}

describe('listarAuditoria', () => {
  it('retorna registros de auditoria paginados', async () => {
    const { id: uid } = await criarUsuario();
    const sql = sqlTeste();
    await inserirAuditoria(sql, uid, 'criar_usuario', uid);
    await inserirAuditoria(sql, uid, 'editar_usuario', uid);

    const { registros, total } = await listarAuditoria(1);
    expect(total).toBeGreaterThanOrEqual(2);
    expect(registros.length).toBeGreaterThanOrEqual(2);
  });

  it('filtra por ação', async () => {
    const { id: uid } = await criarUsuario();
    const sql = sqlTeste();
    await inserirAuditoria(sql, uid, 'acao_especifica_xyz', uid);
    await inserirAuditoria(sql, uid, 'outra_acao', uid);

    const { registros, total } = await listarAuditoria(1, { acao: 'acao_especifica_xyz' });
    expect(total).toBe(1);
    expect(registros[0]?.action).toBe('acao_especifica_xyz');
  });

  it('filtra por usuário', async () => {
    const { id: uid1 } = await criarUsuario();
    const { id: uid2 } = await criarUsuario();
    const sql = sqlTeste();
    await inserirAuditoria(sql, uid1, 'acao_u1');
    await inserirAuditoria(sql, uid2, 'acao_u2');

    const { registros } = await listarAuditoria(1, { usuarioId: uid1 });
    expect(registros.every((r) => r.user_id === uid1)).toBe(true);
  });

  it('retorna página correta', async () => {
    const { id: uid } = await criarUsuario();
    const sql = sqlTeste();
    for (let i = 0; i < 5; i++) {
      await inserirAuditoria(sql, uid, `acao_paginacao_${i}`);
    }

    const { pagina, totalPaginas } = await listarAuditoria(1);
    expect(pagina).toBe(1);
    expect(totalPaginas).toBeGreaterThanOrEqual(1);
  });

  it('retorna usuario_nome vinculado', async () => {
    const { id: uid } = await criarUsuario({ nome: 'Usuário Auditoria' });
    const sql = sqlTeste();
    await inserirAuditoria(sql, uid, 'testar_nome_usuario');

    const { registros } = await listarAuditoria(1, { acao: 'testar_nome_usuario' });
    expect(registros[0]?.usuario_nome).toBe('Usuário Auditoria');
  });
});
