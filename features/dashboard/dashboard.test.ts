import { describe, expect, it } from 'vitest';
import type { Perfil } from '@/lib/permissions';
import { resolverPermissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { carregarDashboard } from './consultas';
import { listarAvisosRecentes } from './avisos';

usarBancoLimpo();

function sessao(id: string, perfil: Perfil): UsuarioSessao {
  return {
    id,
    nome: 'Usuário Teste',
    perfil,
    editorLabel: perfil === 'Editor' ? 'Editor Teste' : null,
    deveTrocarPin: false,
    permissoes: resolverPermissoes(perfil, []),
    ehAprovadorDelegado: false,
  };
}

function novoId(prefixo: string): string {
  return `${prefixo}${Math.random().toString(16).slice(2, 12)}`;
}

async function inserirDemanda(campos: {
  title: string;
  status?: string;
  format?: string;
  editorId?: string | null;
  influencerId?: string | null;
  postOffsetDias?: number | null;
  approvalOffsetDias?: number | null;
  excluida?: boolean;
}): Promise<string> {
  const id = `LF${Math.random().toString(16).slice(2, 12).toUpperCase()}`;
  const status = campos.status ?? 'Não iniciada';
  await sqlTeste()`
    INSERT INTO demands (
      id, title, format, status, editor_id, influencer_id,
      post_date, approval_date, deleted_at, completed_at
    ) VALUES (
      ${id},
      ${campos.title},
      ${campos.format ?? 'Reels'},
      ${status},
      ${campos.editorId ?? null},
      ${campos.influencerId ?? null},
      (now() AT TIME ZONE 'America/Sao_Paulo')::date + ${campos.postOffsetDias ?? null}::int,
      (now() AT TIME ZONE 'America/Sao_Paulo')::date + ${campos.approvalOffsetDias ?? null}::int,
      CASE WHEN ${campos.excluida ?? false} THEN now() ELSE NULL END,
      CASE WHEN ${status} = 'Concluída' THEN now() ELSE NULL END
    )
  `;
  return id;
}

describe('dashboard por perfil', () => {
  it('contadores do administrador batem com a contagem manual', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const influencer = await criarUsuario({ perfil: 'Influencer' });

    const atrasadaPost = await inserirDemanda({
      title: 'Atrasada pela postagem',
      status: 'Em execução',
      postOffsetDias: -1,
      influencerId: influencer.id,
    });
    await inserirDemanda({ title: 'No prazo', status: 'Não iniciada', postOffsetDias: 1 });
    await inserirDemanda({ title: 'Em aprovação', status: 'Aprovação', postOffsetDias: -1 });
    await inserirDemanda({ title: 'Concluída', status: 'Concluída', postOffsetDias: -1 });
    await inserirDemanda({
      title: 'Na lixeira',
      status: 'Em execução',
      postOffsetDias: -1,
      excluida: true,
    });
    await inserirDemanda({ title: 'Cancelada', status: 'Cancelada', postOffsetDias: -1 });
    await inserirDemanda({ title: 'Reprovada', status: 'Reprovada', postOffsetDias: -1 });
    const noPrazoPorPostagem = await inserirDemanda({
      title: 'Postagem futura',
      status: 'Em execução',
      postOffsetDias: 1,
      approvalOffsetDias: -1,
    });
    await inserirDemanda({
      title: 'Atrasada pela aprovação',
      status: 'Em execução',
      approvalOffsetDias: -1,
    });

    await sqlTeste()`
      INSERT INTO mandatory_schedules (id, demand_id, influencer_id, title, version, status)
      VALUES
        (${novoId('ms')}, ${atrasadaPost}, ${influencer.id}, 'Pendência aberta', 1, 'Pendente'),
        (${novoId('ms')}, ${noPrazoPorPostagem}, ${influencer.id}, 'Já agendada', 1, 'Agendada')
    `;

    const visao = await carregarDashboard(sessao(admin.id, 'Administrador'));
    expect(visao.perfil).toBe('Administrador');
    if (visao.perfil !== 'Administrador') return;

    const [manual] = await sqlTeste()<{
      total: number;
      atrasadas: number;
      em_aprovacao: number;
      pendencias: number;
    }[]>`
      SELECT
        (SELECT COUNT(*)::int FROM demands WHERE deleted_at IS NULL) AS total,
        (SELECT COUNT(*)::int FROM demands
          WHERE deleted_at IS NULL
            AND status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
            AND COALESCE(post_date, approval_date) < (now() AT TIME ZONE 'America/Sao_Paulo')::date
        ) AS atrasadas,
        (SELECT COUNT(*)::int FROM demands
          WHERE deleted_at IS NULL AND status = 'Aprovação') AS em_aprovacao,
        (SELECT COUNT(*)::int FROM mandatory_schedules WHERE status = 'Pendente') AS pendencias
    `;

    expect(manual).toMatchObject({ total: 8, atrasadas: 2, em_aprovacao: 1, pendencias: 1 });
    expect(visao.contadores).toEqual({
      total: manual!.total,
      atrasadas: manual!.atrasadas,
      emAprovacao: manual!.em_aprovacao,
      pendencias: manual!.pendencias,
    });

    const titulosAtraso = visao.atrasadas.map((d) => d.titulo);
    expect(titulosAtraso).toEqual(
      expect.arrayContaining(['Atrasada pela postagem', 'Atrasada pela aprovação']),
    );
    expect(titulosAtraso).not.toContain('Na lixeira');
    expect(titulosAtraso).not.toContain('Em aprovação');
    expect(visao.aprovacoes.map((d) => d.titulo)).toEqual(['Em aprovação']);
  });

  it('editor não vê demanda de outro editor', async () => {
    const editor = await criarUsuario({ perfil: 'Editor', nome: 'Editor Alfa' });
    const outro = await criarUsuario({ perfil: 'Editor', nome: 'Editor Beta' });

    await inserirDemanda({ title: 'Demanda do editor', status: 'Em execução', editorId: editor.id });
    await inserirDemanda({ title: 'Demanda de outro editor', status: 'Em execução', editorId: outro.id });
    await inserirDemanda({ title: 'Demanda sem editor', status: 'Não iniciada' });

    const visao = await carregarDashboard(sessao(editor.id, 'Editor'));
    expect(visao.perfil).toBe('Editor');
    if (visao.perfil !== 'Editor') return;

    const titulos = visao.demandas.map((d) => d.titulo);
    expect(titulos).toContain('Demanda do editor');
    expect(titulos).not.toContain('Demanda de outro editor');
    expect(titulos).not.toContain('Demanda sem editor');
    expect(visao.entregas).toEqual([]);
  });

  it('influencer vê a própria pendência de agendamento', async () => {
    const influencer = await criarUsuario({ perfil: 'Influencer', nome: 'Influencer Alfa' });
    const outro = await criarUsuario({ perfil: 'Influencer', nome: 'Influencer Beta' });

    const propria = await inserirDemanda({
      title: 'Demanda do influencer',
      status: 'Em execução',
      influencerId: influencer.id,
    });
    const alheia = await inserirDemanda({
      title: 'Demanda de outro influencer',
      status: 'Em execução',
      influencerId: outro.id,
    });

    await sqlTeste()`
      INSERT INTO mandatory_schedules (id, demand_id, influencer_id, title, version, status)
      VALUES
        (${novoId('ms')}, ${propria}, ${influencer.id}, 'Pendência própria', 1, 'Pendente'),
        (${novoId('ms')}, ${alheia}, ${outro.id}, 'Pendência alheia', 1, 'Pendente')
    `;
    await sqlTeste()`
      INSERT INTO post_schedules (
        id, influencer_id, title, platform, scheduled_at, status, brand, scheduled_by
      ) VALUES
        (
          ${novoId('ps')}, ${influencer.id}, 'Postagem própria', 'Instagram',
          now() + interval '1 day', 'Agendada', 'Loumar', ${influencer.id}
        ),
        (
          ${novoId('ps')}, ${outro.id}, 'Postagem alheia', 'Instagram',
          now() + interval '2 days', 'Agendada', 'Loumar', ${outro.id}
        )
    `;

    const visao = await carregarDashboard(sessao(influencer.id, 'Influencer'));
    expect(visao.perfil).toBe('Influencer');
    if (visao.perfil !== 'Influencer') return;

    expect(visao.pendencias.map((p) => p.titulo)).toEqual(['Pendência própria']);
    expect(visao.agendamentos.map((a) => a.titulo)).toEqual(['Postagem própria']);
    expect(visao.demandas.map((d) => d.titulo)).toEqual(['Demanda do influencer']);
  });

  it('aprovador delegado vê a entrega do editor', async () => {
    const delegado = await criarUsuario({ perfil: 'Editor', nome: 'Editor Delegado' });
    const editor = await criarUsuario({ perfil: 'Editor', nome: 'Editor da Demanda' });
    const fora = await criarUsuario({ perfil: 'Editor', nome: 'Editor de Fora' });

    await sqlTeste()`
      INSERT INTO approval_delegations (approver_id, editor_id)
      VALUES (${delegado.id}, ${editor.id})
    `;

    const demanda = await inserirDemanda({
      title: 'Demanda delegada',
      status: 'Aprovação',
      editorId: editor.id,
    });
    const outra = await inserirDemanda({
      title: 'Demanda fora da delegação',
      status: 'Aprovação',
      editorId: fora.id,
    });
    const entregaId = novoId('en');
    const entregaFora = novoId('en');
    await sqlTeste()`
      INSERT INTO deliveries (id, demand_id, version, link, editor_id, status)
      VALUES
        (${entregaId}, ${demanda}, 1, 'https://exemplo.test/arquivo', ${editor.id}, 'Aguardando aprovação'),
        (${entregaFora}, ${outra}, 1, 'https://exemplo.test/outro', ${fora.id}, 'Aguardando aprovação')
    `;

    const visao = await carregarDashboard(sessao(delegado.id, 'Editor'));
    expect(visao.perfil).toBe('Editor');
    if (visao.perfil !== 'Editor') return;

    expect(visao.demandas.map((d) => d.titulo)).toContain('Demanda delegada');
    expect(visao.demandas.map((d) => d.titulo)).not.toContain('Demanda fora da delegação');
    expect(visao.entregas.map((e) => e.id)).toEqual([entregaId]);
    expect(visao.entregas[0]?.titulo).toBe('Demanda delegada');
  });

  it('relógio do ciclo aberto desconta a pausa em aberto', async () => {
    const editor = await criarUsuario({ perfil: 'Editor' });
    const outro = await criarUsuario({ perfil: 'Editor' });

    const comPausa = await inserirDemanda({
      title: 'Ciclo pausado',
      status: 'Pausada',
      editorId: editor.id,
    });
    const livre = await inserirDemanda({
      title: 'Ciclo livre',
      status: 'Em execução',
      editorId: editor.id,
    });
    const encerrado = await inserirDemanda({
      title: 'Ciclo encerrado',
      status: 'Em execução',
      editorId: editor.id,
    });
    const alheio = await inserirDemanda({
      title: 'Ciclo de outro editor',
      status: 'Em execução',
      editorId: outro.id,
    });

    await sqlTeste()`
      INSERT INTO editing_cycles (id, demand_id, version, editor_id, started_at, ended_at, status)
      VALUES
        (${novoId('cy')}, ${comPausa}, 1, ${editor.id}, now() - interval '2 hours', NULL, 'Em andamento'),
        (${novoId('cy')}, ${livre}, 1, ${editor.id}, now() - interval '45 minutes', NULL, 'Em andamento'),
        (
          ${novoId('cy')}, ${encerrado}, 1, ${editor.id},
          now() - interval '3 hours', now() - interval '1 hour', 'Concluído'
        ),
        (${novoId('cy')}, ${alheio}, 1, ${outro.id}, now() - interval '1 hour', NULL, 'Em andamento')
    `;
    await sqlTeste()`
      INSERT INTO demand_pauses (id, demand_id, paused_at, user_id)
      VALUES (${novoId('pa')}, ${comPausa}, now() - interval '30 minutes', ${editor.id})
    `;

    const visao = await carregarDashboard(sessao(editor.id, 'Editor'));
    if (visao.perfil !== 'Editor') throw new Error('perfil inesperado');

    const titulos = visao.ciclos.map((c) => c.titulo);
    expect(titulos).toEqual(expect.arrayContaining(['Ciclo pausado', 'Ciclo livre']));
    expect(titulos).not.toContain('Ciclo encerrado');
    expect(titulos).not.toContain('Ciclo de outro editor');

    const pausado = visao.ciclos.find((c) => c.titulo === 'Ciclo pausado');
    expect(pausado?.pausado).toBe(true);
    expect(pausado!.decorridoMs).toBeGreaterThan(89.5 * 60_000);
    expect(pausado!.decorridoMs).toBeLessThan(90.5 * 60_000);

    const andando = visao.ciclos.find((c) => c.titulo === 'Ciclo livre');
    expect(andando?.pausado).toBe(false);
    expect(andando!.decorridoMs).toBeGreaterThan(44 * 60_000);
    expect(andando!.decorridoMs).toBeLessThan(46 * 60_000);
  });

  it('relógio desconta a pausa já encerrada e não a conta de novo', async () => {
    const editor = await criarUsuario({ perfil: 'Editor' });
    const demanda = await inserirDemanda({
      title: 'Ciclo com pausa encerrada',
      status: 'Em execução',
      editorId: editor.id,
    });

    await sqlTeste()`
      INSERT INTO editing_cycles (id, demand_id, version, editor_id, started_at, status)
      VALUES (${novoId('cy')}, ${demanda}, 1, ${editor.id}, now() - interval '2 hours', 'Em andamento')
    `;
    await sqlTeste()`
      INSERT INTO demand_pauses (id, demand_id, paused_at, resumed_at, user_id)
      VALUES (
        ${novoId('pa')},
        ${demanda},
        now() - interval '90 minutes',
        now() - interval '60 minutes',
        ${editor.id}
      )
    `;

    const visao = await carregarDashboard(sessao(editor.id, 'Editor'));
    if (visao.perfil !== 'Editor') throw new Error('perfil inesperado');
    const ciclo = visao.ciclos.find((c) => c.titulo === 'Ciclo com pausa encerrada');
    expect(ciclo?.pausado).toBe(false);
    expect(ciclo!.decorridoMs).toBeGreaterThan(89.5 * 60_000);
    expect(ciclo!.decorridoMs).toBeLessThan(90.5 * 60_000);
    expect(Math.abs(ciclo!.atualizadoEmMs - Date.now())).toBeLessThan(5_000);
  });
});

describe('painel operacional', () => {
  it('indicadores do administrador seguem a fila, a produção e a aprovação', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const editor = await criarUsuario({ perfil: 'Editor' });
    await inserirDemanda({ title: 'Sem editor', status: 'Não iniciada' });
    await inserirDemanda({ title: 'Em execução', status: 'Em execução', editorId: editor.id, postOffsetDias: 4 });
    await inserirDemanda({ title: 'Atrasada', status: 'Em execução', editorId: editor.id, postOffsetDias: -1 });
    await inserirDemanda({ title: 'Na aprovação', status: 'Aprovação', editorId: editor.id });
    await inserirDemanda({ title: 'Pronta', status: 'Concluída', editorId: editor.id, postOffsetDias: -3 });

    const visao = await carregarDashboard(sessao(admin.id, 'Administrador'));
    if (visao.perfil !== 'Administrador') throw new Error('perfil inesperado');

    expect(visao.titulo).toBe('Visão geral da operação');
    expect(visao.indicadores).toEqual([
      { chave: 'aguardandoEditor', rotulo: 'Aguardando editor', valor: 1 },
      { chave: 'emProducao', rotulo: 'Em produção', valor: 4 },
      { chave: 'atrasadas', rotulo: 'Atrasadas', valor: 1 },
      { chave: 'aguardandoAprovacao', rotulo: 'Aguardando aprovação', valor: 1 },
    ]);
  });

  it('classifica prazos de hoje, amanhã, dois dias e atraso', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    await inserirDemanda({ title: 'Vence hoje', status: 'Em execução', postOffsetDias: 0 });
    await inserirDemanda({ title: 'Vence amanhã', status: 'Não iniciada', postOffsetDias: 1 });
    await inserirDemanda({ title: 'Vence em dois dias', status: 'Em execução', postOffsetDias: 2 });
    await inserirDemanda({ title: 'Fora da faixa', status: 'Em execução', postOffsetDias: 3 });
    await inserirDemanda({ title: 'Atrasada dois dias', status: 'Em execução', postOffsetDias: -2 });
    await inserirDemanda({ title: 'Aprovação com prazo', status: 'Aprovação', postOffsetDias: -1 });
    await inserirDemanda({ title: 'Já concluída', status: 'Concluída', postOffsetDias: 0 });

    const visao = await carregarDashboard(sessao(admin.id, 'Administrador'));
    if (visao.perfil !== 'Administrador') throw new Error('perfil inesperado');

    const porTitulo = new Map(visao.alertasPrazo.map((alerta) => [alerta.titulo, alerta]));
    expect(porTitulo.get('Vence hoje')).toMatchObject({ nivel: 'hoje', textoPrazo: 'VENCE HOJE', diasParaPrazo: 0 });
    expect(porTitulo.get('Vence amanhã')).toMatchObject({ nivel: 'amanha', textoPrazo: 'VENCE AMANHÃ', diasParaPrazo: 1 });
    expect(porTitulo.get('Vence em dois dias')).toMatchObject({
      nivel: 'dois-dias',
      textoPrazo: 'VENCE EM 2 DIAS',
      diasParaPrazo: 2,
    });
    expect(porTitulo.get('Atrasada dois dias')).toMatchObject({
      nivel: 'atrasada',
      textoPrazo: 'ATRASADA HÁ 2 DIAS',
      diasParaPrazo: -2,
    });
    expect(porTitulo.has('Fora da faixa')).toBe(false);
    expect(porTitulo.has('Aprovação com prazo')).toBe(false);
    expect(porTitulo.has('Já concluída')).toBe(false);
  });

  it('fila compartilhada fica com o editor e some para o influencer', async () => {
    const editor = await criarUsuario({ perfil: 'Editor' });
    const influencer = await criarUsuario({ perfil: 'Influencer' });
    const sugerido = await criarUsuario({ perfil: 'Editor', nome: 'Editor Sugerido' });
    const livre = await inserirDemanda({ title: 'Demanda livre', status: 'Não iniciada', postOffsetDias: 1 });
    await inserirDemanda({ title: 'Corte sem editor', status: 'Não iniciada', format: 'Cortes' });
    await sqlTeste()`
      INSERT INTO technical_sheets (demand_id, sent_by, suggested_editor_id)
      VALUES (${livre}, ${editor.id}, ${sugerido.id})
    `;
    await inserirDemanda({
      title: 'Conteúdo do influencer',
      status: 'Em execução',
      influencerId: influencer.id,
    });

    const doEditor = await carregarDashboard(sessao(editor.id, 'Editor'));
    if (doEditor.perfil !== 'Editor') throw new Error('perfil inesperado');
    expect(doEditor.fila.map((item) => item.titulo)).toEqual(['Demanda livre', 'Conteúdo do influencer']);
    expect(doEditor.fila.map((item) => item.titulo)).not.toContain('Corte sem editor');
    expect(doEditor.fila[0]?.editorSugerido).toBe('Editor Sugerido');
    expect(doEditor.demandas.map((item) => item.titulo)).not.toContain('Demanda livre');

    const doInfluencer = await carregarDashboard(sessao(influencer.id, 'Influencer'));
    if (doInfluencer.perfil !== 'Influencer') throw new Error('perfil inesperado');
    expect(doInfluencer.demandas.map((item) => item.titulo)).toEqual(['Conteúdo do influencer']);
    expect(doInfluencer.prioridades.map((item) => item.titulo)).not.toContain('Demanda livre');
    expect(doInfluencer.alertasPrazo.map((item) => item.titulo)).not.toContain('Demanda livre');
  });

  it('saúde da operação só entra com ver relatórios e a carga marca staff', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador', nome: 'Admin Painel' });
    const editor = await criarUsuario({ perfil: 'Editor', nome: 'Editor Carga' });
    const staff = await criarUsuario({ perfil: 'Editor', nome: 'Pessoa Staff' });
    await sqlTeste()`
      INSERT INTO user_permissions (user_id, permission_key, granted)
      VALUES (${staff.id}, 'notaInformativaRanking', true)
    `;

    const parada = await inserirDemanda({
      title: 'Parada na fila',
      status: 'Em execução',
      editorId: editor.id,
      postOffsetDias: 5,
    });
    await sqlTeste()`UPDATE demands SET created_at = now() - interval '4 days' WHERE id = ${parada}`;

    const antiga = await inserirDemanda({
      title: 'Aprovação antiga',
      status: 'Aprovação',
      editorId: editor.id,
    });
    await sqlTeste()`
      INSERT INTO deliveries (id, demand_id, version, link, editor_id, status, delivered_at)
      VALUES (
        ${novoId('en')}, ${antiga}, 1, 'https://exemplo.test/entrega', ${editor.id},
        'Aguardando aprovação', now() - interval '30 hours'
      )
    `;

    const comAjustes = await inserirDemanda({
      title: 'Ajustes repetidos',
      status: 'Ajustes solicitados',
      editorId: editor.id,
    });
    await sqlTeste()`
      INSERT INTO deliveries (id, demand_id, version, link, editor_id, status, reason)
      VALUES
        (${novoId('en')}, ${comAjustes}, 1, 'https://exemplo.test/v1', ${editor.id}, 'Ajustes solicitados', 'Refazer abertura'),
        (${novoId('en')}, ${comAjustes}, 2, 'https://exemplo.test/v2', ${editor.id}, 'Ajustes solicitados', 'Encurtar o final')
    `;

    await inserirDemanda({ title: 'Atraso um', status: 'Em execução', editorId: editor.id, postOffsetDias: -1 });
    await inserirDemanda({ title: 'Atraso dois', status: 'Em execução', editorId: editor.id, postOffsetDias: -2 });
    const doStaff = await inserirDemanda({
      title: 'Demanda staff',
      status: 'Em execução',
      editorId: staff.id,
      postOffsetDias: 2,
    });
    await sqlTeste()`
      INSERT INTO editing_cycles (
        id, demand_id, version, editor_id, started_at, ended_at, active_ms, status
      ) VALUES (
        ${novoId('cy')}, ${doStaff}, 1, ${staff.id},
        now() - interval '3 hours', now() - interval '1 hour', ${2 * 3_600_000}, 'Concluído'
      )
    `;

    const visao = await carregarDashboard(sessao(admin.id, 'Administrador'));
    if (visao.perfil !== 'Administrador') throw new Error('perfil inesperado');
    expect(visao.saude).toMatchObject({
      paradas: 1,
      aprovacoes24h: 1,
      ajustesRecorrentes: 1,
    });
    expect(visao.saude?.editoresSobrecarregados).toBeGreaterThanOrEqual(1);
    expect(visao.saude?.alertas.map((alerta) => alerta.titulo)).toEqual(
      expect.arrayContaining(['Parada na fila', 'Aprovação antiga']),
    );
    expect(visao.saude?.formatos).toEqual([{ formato: 'Reels', horas: 2 }]);
    expect(visao.concluidas14).toHaveLength(14);

    const pessoa = visao.carga.find((item) => item.nome === 'Pessoa Staff');
    const comum = visao.carga.find((item) => item.nome === 'Editor Carga');
    expect(pessoa?.staff).toBe(true);
    expect(comum?.staff).toBe(false);
    expect(comum?.atrasadas).toBeGreaterThanOrEqual(2);
    expect(visao).not.toHaveProperty('ranking');

    const semRelatorio = sessao(admin.id, 'Administrador');
    semRelatorio.permissoes = { ...semRelatorio.permissoes, verRelatorios: false };
    const oculto = await carregarDashboard(semRelatorio);
    if (oculto.perfil !== 'Administrador') throw new Error('perfil inesperado');
    expect(oculto.saude).toBeNull();
    expect(oculto.concluidas14).toEqual([]);
    expect(oculto.carga.length).toBeGreaterThan(0);
  });

  it('título do aprovador delegado muda e a fila de cortes continua de fora', async () => {
    const delegado = await criarUsuario({ perfil: 'Editor', nome: 'Editor Delegado' });
    const editor = await criarUsuario({ perfil: 'Editor', nome: 'Editor da Demanda' });
    await sqlTeste()`
      INSERT INTO approval_delegations (approver_id, editor_id)
      VALUES (${delegado.id}, ${editor.id})
    `;
    await inserirDemanda({ title: 'Na aprovação delegada', status: 'Aprovação', editorId: editor.id });

    const sessaoDelegada = sessao(delegado.id, 'Editor');
    sessaoDelegada.ehAprovadorDelegado = true;
    const visao = await carregarDashboard(sessaoDelegada);
    if (visao.perfil !== 'Editor') throw new Error('perfil inesperado');
    expect(visao.titulo).toBe('Sua fila e aprovações autorizadas');
    expect(visao.prioridades.map((item) => item.titulo)).toContain('Na aprovação delegada');
  });

  it('o histórico vira aviso só para quem enxerga a demanda', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const editor = await criarUsuario({ perfil: 'Editor', nome: 'Editor do Aviso' });
    const outro = await criarUsuario({ perfil: 'Editor', nome: 'Editor de Fora' });
    const demanda = await inserirDemanda({
      title: 'Demanda avisada',
      status: 'Aprovação',
      editorId: editor.id,
    });
    await sqlTeste()`
      INSERT INTO history (demand_id, action, user_id)
      VALUES (${demanda}, 'status:Aprovação', ${editor.id})
    `;

    const doAdmin = await listarAvisosRecentes(sqlTeste(), sessao(admin.id, 'Administrador'));
    expect(doAdmin[0]).toMatchObject({
      titulo: 'Demanda avisada',
      texto: 'O andamento da demanda foi atualizado',
      status: 'Aprovação',
      editor: 'Editor do Aviso',
    });

    const doEditor = await listarAvisosRecentes(sqlTeste(), sessao(editor.id, 'Editor'));
    expect(doEditor.map((aviso) => aviso.titulo)).toContain('Demanda avisada');

    const deFora = await listarAvisosRecentes(sqlTeste(), sessao(outro.id, 'Editor'));
    expect(deFora.map((aviso) => aviso.titulo)).not.toContain('Demanda avisada');
  });
});
