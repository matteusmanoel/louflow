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
        aguardandoAprovacao: expect.any(Number),
        semEditor: expect.any(Number),
      },
      demandasPendentes: expect.any(Array),
      alertas: {
        itens: expect.any(Array),
        totalAtrasadas: 0,
        totalProximas: 0,
      },
      aprovacoes: expect.any(Array),
      influencers: expect.any(Array),
      entregas: expect.any(Array),
      agenda: expect.any(Array),
      captacoes: expect.any(Array),
      cortes: expect.any(Array),
      ranking: expect.any(Array),
      produtividade: null,
      cargaEditores: expect.any(Array),
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
    expect(demanda!.prazo).not.toBeNull();
    expect(typeof demanda!.diasParaPrazo).toBe('number');
  });

  it('corta as listas em 8 e não trata aprovação como atraso de prazo', async () => {
    const sql = sqlTeste();
    const u = await criarUsuario();

    for (let i = 0; i < 9; i += 1) {
      await sql`
        INSERT INTO demands (id, title, format, status, priority, created_by)
        VALUES (${`LFtv04${i}`}, ${`Fila ${i}`}, 'Reels', 'Não iniciada', 'Normal', ${u.id})
      `;
    }
    await sql`
      INSERT INTO demands (id, title, format, status, post_date, created_by) VALUES
        ('LFtv0490', 'Na aprovação', 'Reels', 'Aprovação',
          (timezone('America/Sao_Paulo', now()))::date - 3, ${u.id}),
        ('LFtv0491', 'Atrasada de verdade', 'Reels', 'Em execução',
          (timezone('America/Sao_Paulo', now()))::date - 3, ${u.id})
    `;

    const dados = await carregarDadosTv(sql);
    expect(dados.demandasPendentes).toHaveLength(8);
    expect(dados.resumoMes.atrasadas).toBe(1);
    expect(dados.alertas.totalAtrasadas).toBe(1);
    expect(dados.alertas.itens.map((item) => String(item.titulo))).toContain('Atrasada de verdade');
    expect(dados.alertas.itens.map((item) => String(item.titulo))).not.toContain('Na aprovação');
    expect(dados.resumoMes.aguardandoAprovacao).toBe(1);
    expect(dados.resumoMes.semEditor).toBeGreaterThan(0);
  });

  it('entrega recente não carrega link nem motivo', async () => {
    const sql = sqlTeste();
    const u = await criarUsuario();
    await sql`
      INSERT INTO demands (id, title, format, status, created_by)
      VALUES ('LFtv0601', 'Entrega pública', 'Reels', 'Em execução', ${u.id})
    `;
    await sql`
      INSERT INTO deliveries (id, demand_id, version, link, note, editor_id, status, reason)
      VALUES ('ENtv0601', 'LFtv0601', 1, 'https://segredo.exemplo.test/arquivo', 'nota interna', ${u.id},
              'Ajustes solicitados', 'motivo secreto')
    `;

    const dados = await carregarDadosTv(sql);
    const entrega = dados.entregas[0];
    expect(entrega).toBeDefined();
    expect(entrega).not.toHaveProperty('link');
    expect(entrega).not.toHaveProperty('reason');
    expect(JSON.stringify(entrega)).not.toContain('segredo');
    expect(JSON.stringify(entrega)).not.toContain('motivo secreto');
  });

  it('junta aprovar e agendar do mesmo influencer', async () => {
    const sql = sqlTeste();
    const inf = await criarUsuario({ nome: 'Influencer Painel', perfil: 'Influencer' });
    await sql`
      INSERT INTO demands (id, title, format, status, influencer_id, created_by)
      VALUES ('LFtv0701', 'Para aprovar', 'Reels', 'Aprovação', ${inf.id}, ${inf.id})
    `;
    await sql`
      INSERT INTO mandatory_schedules (id, demand_id, influencer_id, title, version, status)
      VALUES ('MStv0701', 'LFtv0701', ${inf.id}, 'Para agendar', 1, 'Pendente')
    `;

    const dados = await carregarDadosTv(sql);
    expect(dados.influencers).toContainEqual({ nome: 'Influencer Painel', aprovar: 1, agendar: 1 });
  });

  it('calcula a nota do mês e separa quem tem nota informativa', async () => {
    const sql = sqlTeste();
    const editor = await criarUsuario({ nome: 'Editor Nota', perfil: 'Editor' });
    const staff = await criarUsuario({ nome: 'Pessoa Staff', perfil: 'Administrador' });
    await sql`
      UPDATE users SET editor_label = 'Editor Nota' WHERE id = ${editor.id}
    `;
    await sql`
      UPDATE users SET editor_label = 'Pessoa Staff' WHERE id = ${staff.id}
    `;
    await sql`
      INSERT INTO user_permissions (user_id, permission_key, granted)
      VALUES (${staff.id}, 'notaInformativaRanking', true)
    `;
    await sql`
      INSERT INTO demands (id, title, format, status, completed_at, editor_id, created_by) VALUES
        ('LFtv0801', 'Nota A', 'Reels', 'Concluída', now(), ${editor.id}, ${editor.id}),
        ('LFtv0802', 'Nota B', 'Reels', 'Concluída', now(), ${editor.id}, ${editor.id}),
        ('LFtv0803', 'Nota staff', 'Reels', 'Concluída', now(), ${staff.id}, ${staff.id})
    `;

    const dados = await carregarDadosTv(sql);
    expect(dados.ranking.map((item) => ({
      editor: String(item.editor),
      nota: Number(item.nota),
      staff: Boolean(item.staff),
    }))).toEqual([
      { editor: 'Editor Nota', nota: 85.7, staff: false },
      { editor: 'Pessoa Staff', nota: 57.1, staff: true },
    ]);
    expect(dados.produtividade?.totalConcluidas).toBe(3);
    expect(dados.cargaEditores.map((item) => String(item.editor))).toContain('Editor Nota');
    expect(dados.cargaEditores.map((item) => String(item.editor))).not.toContain('Pessoa Staff');
  });
});
