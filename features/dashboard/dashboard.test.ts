import { describe, expect, it } from 'vitest';
import type { Perfil } from '@/lib/permissions';
import { resolverPermissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { carregarDashboard } from './consultas';

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
      'Reels',
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
