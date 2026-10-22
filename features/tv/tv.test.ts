import { describe, expect, it } from 'vitest';
import { carregarDadosTv } from './consultas';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '../../tests/helpers/db';

usarBancoLimpo();

describe('carregarDadosTv', () => {
  it('retorna a forma correta quando o banco está vazio', async () => {
    const dados = await carregarDadosTv(sqlTeste());

    expect(dados).toMatchObject({
      resumoMes: {
        criadas: expect.any(Number),
        concluidas: expect.any(Number),
        emAndamento: expect.any(Number),
        atrasadas: expect.any(Number),
      },
      demandasPendentes: expect.any(Array),
      aprovacoes: expect.any(Array),
      agenda: expect.any(Array),
      captacoes: expect.any(Array),
      cortes: expect.any(Array),
    });

    expect(dados.resumoMes.emAndamento).toBe(0);
    expect(dados.demandasPendentes).toHaveLength(0);
  });

  it('demandasPendentes inclui apenas demandas ativas (exclui Concluída e Cancelada)', async () => {
    const sql = sqlTeste();
    const u = await criarUsuario();

    // Demandas ativas
    await sql`
      INSERT INTO demands (id, title, format, status, created_by) VALUES
        ('LFtv0001', 'Não Iniciada TV', 'Reels', 'Não iniciada', ${u.id}),
        ('LFtv0002', 'Em Execução TV',  'Reels', 'Em execução',  ${u.id}),
        ('LFtv0003', 'Pausada TV',       'Reels', 'Pausada',      ${u.id}),
        ('LFtv0004', 'Aprovação TV',     'Reels', 'Aprovação',    ${u.id})
    `;

    // Demanda concluída (requer completed_at por CHECK)
    await sql`
      INSERT INTO demands (id, title, format, status, completed_at, created_by) VALUES
        ('LFtv0005', 'Concluída TV', 'Reels', 'Concluída', now(), ${u.id})
    `;

    // Demanda cancelada
    await sql`
      INSERT INTO demands (id, title, format, status, created_by) VALUES
        ('LFtv0006', 'Cancelada TV', 'Reels', 'Cancelada', ${u.id})
    `;

    const dados = await carregarDadosTv(sql);
    const ids = dados.demandasPendentes.map((d) => String(d.id));

    expect(ids).toContain('LFtv0001');
    expect(ids).toContain('LFtv0002');
    expect(ids).toContain('LFtv0003');
    expect(ids).toContain('LFtv0004');
    expect(ids).not.toContain('LFtv0005'); // Concluída
    expect(ids).not.toContain('LFtv0006'); // Cancelada
  });

  it('demandasPendentes exclui demandas na Lixeira', async () => {
    const sql = sqlTeste();
    const u = await criarUsuario();

    await sql`
      INSERT INTO demands (id, title, format, status, created_by, deleted_at) VALUES
        ('LFtv0007', 'Na Lixeira TV', 'Reels', 'Não iniciada', ${u.id}, now())
    `;

    const dados = await carregarDadosTv(sql);
    const ids = dados.demandasPendentes.map((d) => String(d.id));
    expect(ids).not.toContain('LFtv0007');
  });

  it('resumoMes.emAndamento conta apenas demandas ativas excluindo Lixeira', async () => {
    const sql = sqlTeste();
    const u = await criarUsuario();

    await sql`
      INSERT INTO demands (id, title, format, status, created_by) VALUES
        ('LFtv0010', 'Ativa A', 'Reels', 'Não iniciada', ${u.id}),
        ('LFtv0011', 'Ativa B', 'Reels', 'Em execução',  ${u.id})
    `;
    await sql`
      INSERT INTO demands (id, title, format, status, completed_at, created_by) VALUES
        ('LFtv0012', 'Concluída X', 'Reels', 'Concluída', now(), ${u.id})
    `;
    await sql`
      INSERT INTO demands (id, title, format, status, created_by, deleted_at) VALUES
        ('LFtv0013', 'Lixeira Y', 'Reels', 'Não iniciada', ${u.id}, now())
    `;

    const dados = await carregarDadosTv(sql);
    // Apenas LFtv0010 e LFtv0011 contam como em andamento
    expect(dados.resumoMes.emAndamento).toBe(2);
  });

  it('resumoMes.atrasadas conta demandas com post_date no passado e status ativo', async () => {
    const sql = sqlTeste();
    const u = await criarUsuario();

    await sql`
      INSERT INTO demands (id, title, format, status, post_date, created_by) VALUES
        ('LFtv0020', 'Atrasada', 'Reels', 'Em execução', CURRENT_DATE - 2, ${u.id}),
        ('LFtv0021', 'No prazo', 'Reels', 'Em execução', CURRENT_DATE + 2, ${u.id}),
        ('LFtv0022', 'Sem prazo', 'Reels', 'Em execução', NULL, ${u.id})
    `;

    const dados = await carregarDadosTv(sql);
    expect(dados.resumoMes.atrasadas).toBeGreaterThanOrEqual(1);
  });

  it('demandasPendentes retorna os campos esperados pelo DTO', async () => {
    const sql = sqlTeste();
    const u = await criarUsuario({ nome: 'Editor Teste', perfil: 'Editor' });

    await sql`
      INSERT INTO demands (id, title, format, status, priority, post_date, editor_id, created_by)
      VALUES ('LFtv0030', 'Demanda com Editor', 'Reels', 'Em execução', 'Alta', CURRENT_DATE + 5, ${u.id}, ${u.id})
    `;

    const dados = await carregarDadosTv(sql);
    const demanda = dados.demandasPendentes.find((d) => String(d.id) === 'LFtv0030');
    expect(demanda).toBeDefined();
    expect(demanda).toMatchObject({
      id: 'LFtv0030',
      titulo: 'Demanda com Editor',
      formato: 'Reels',
      status: 'Em execução',
      prioridade: 'Alta',
    });
    // prazo deve ser uma Data
    expect(demanda!.prazo).not.toBeNull();
  });
});
