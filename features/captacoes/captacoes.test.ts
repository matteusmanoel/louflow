import { describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import { resolverPermissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { defAgendarCaptacao, defEditarCaptacao, defCancelarCaptacao } from './actions';
import { listarCaptacoes, obterCaptacao } from './consultas';
import { encerrarCaptacoesVencidas } from './jobs';

usarBancoLimpo();

// ---- helpers de sessão ----

const sessaoDe = (
  id: string,
  permissoes: Partial<ReturnType<typeof resolverPermissoes>> = {},
): UsuarioSessao => ({
  id,
  nome: 'Teste',
  perfil: 'Editor',
  editorLabel: null,
  deveTrocarPin: false,
  permissoes: { ...resolverPermissoes('Editor', []), ...permissoes },
  ehAprovadorDelegado: false,
});

const deps = (usuario: UsuarioSessao) => ({
  obterUsuario: async () => usuario,
  sql: sqlTeste,
});

// ---- helpers de fixture ----

const hora = (h: number, dia = 15) =>
  new Date(Date.UTC(2026, 10, dia, h, 0, 0)).toISOString();

async function agendarFixture(videomakerId: string, hInicio = 8, hFim = 10) {
  const u = await criarUsuario();
  return executarAcao(
    defAgendarCaptacao,
    { startsAt: hora(hInicio), endsAt: hora(hFim), videomakerId },
    deps(sessaoDe(u.id, { gerenciarCaptacoes: true, verCaptacoes: true })),
  );
}

// ============================================================
// 1. Agendar sem sobreposição
// ============================================================
describe('agendarCaptacao', () => {
  it('cria Captação para videomaker disponível', async () => {
    const vm = await criarUsuario();
    const u = await criarUsuario();
    const sessao = sessaoDe(u.id, { gerenciarCaptacoes: true, verCaptacoes: true });

    const r = await executarAcao(
      defAgendarCaptacao,
      { startsAt: hora(8), endsAt: hora(10), videomakerId: vm.id, subject: 'Evento X', location: 'Foz' },
      deps(sessao),
    );

    expect(r).toMatchObject({ ok: true, mensagem: 'Captação agendada.' });
    const [linha] = await sqlTeste()`SELECT subject, location FROM captures WHERE id = ${r.dados!.id}`;
    expect(linha).toMatchObject({ subject: 'Evento X', location: 'Foz' });
  });

  it('mesmo videomaker, janelas distintas — ambas são criadas', async () => {
    const vm = await criarUsuario();
    const u = await criarUsuario();
    const sessao = sessaoDe(u.id, { gerenciarCaptacoes: true, verCaptacoes: true });

    const r1 = await executarAcao(defAgendarCaptacao, { startsAt: hora(8), endsAt: hora(10), videomakerId: vm.id }, deps(sessao));
    const r2 = await executarAcao(defAgendarCaptacao, { startsAt: hora(11), endsAt: hora(13), videomakerId: vm.id }, deps(sessao));

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
  });

  // ---- Sobreposição ----
  it('sobreposição retorna mensagem amigável da restrição EXCLUDE', async () => {
    const vm = await criarUsuario();
    const u = await criarUsuario();
    const sessao = sessaoDe(u.id, { gerenciarCaptacoes: true, verCaptacoes: true });

    const r1 = await executarAcao(defAgendarCaptacao, { startsAt: hora(8), endsAt: hora(10), videomakerId: vm.id }, deps(sessao));
    expect(r1.ok).toBe(true);

    // Janela sobreposta: 9h–11h
    const r2 = await executarAcao(defAgendarCaptacao, { startsAt: hora(9), endsAt: hora(11), videomakerId: vm.id }, deps(sessao));
    expect(r2).toMatchObject({ ok: false, mensagem: 'Este videomaker já tem Captação neste horário.' });
  });

  it('videomakers diferentes podem ter Captações sobrepostas', async () => {
    const vm1 = await criarUsuario();
    const vm2 = await criarUsuario();
    const u = await criarUsuario();
    const sessao = sessaoDe(u.id, { gerenciarCaptacoes: true, verCaptacoes: true });

    const r1 = await executarAcao(defAgendarCaptacao, { startsAt: hora(8), endsAt: hora(10), videomakerId: vm1.id }, deps(sessao));
    const r2 = await executarAcao(defAgendarCaptacao, { startsAt: hora(8), endsAt: hora(10), videomakerId: vm2.id }, deps(sessao));

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
  });

  it('schema rejeita quando fim <= início', async () => {
    const vm = await criarUsuario();
    const u = await criarUsuario();
    const sessao = sessaoDe(u.id, { gerenciarCaptacoes: true });

    const r = await executarAcao(
      defAgendarCaptacao,
      { startsAt: hora(10), endsAt: hora(8), videomakerId: vm.id },
      deps(sessao),
    );
    expect(r).toMatchObject({ ok: false, mensagem: 'O horário de fim deve ser posterior ao de início.' });
  });
});

// ============================================================
// 2. Editar Captação
// ============================================================
describe('editarCaptacao', () => {
  it('atualiza campos de uma Captação Agendada', async () => {
    const vm = await criarUsuario();
    const r = await agendarFixture(vm.id);
    expect(r.ok).toBe(true);

    const u = await criarUsuario();
    const sessao = sessaoDe(u.id, { gerenciarCaptacoes: true });

    const re = await executarAcao(
      defEditarCaptacao,
      { id: r.dados!.id, startsAt: hora(9), endsAt: hora(11), videomakerId: vm.id, subject: 'Novo assunto' },
      deps(sessao),
    );
    expect(re).toMatchObject({ ok: true });

    const [linha] = await sqlTeste()`SELECT subject FROM captures WHERE id = ${r.dados!.id}`;
    expect(linha?.subject).toBe('Novo assunto');
  });

  it('editar Captação não existente retorna erro de domínio', async () => {
    const vm = await criarUsuario();
    const u = await criarUsuario();
    const sessao = sessaoDe(u.id, { gerenciarCaptacoes: true });

    const r = await executarAcao(
      defEditarCaptacao,
      { id: 'NAO_EXISTE', startsAt: hora(8), endsAt: hora(10), videomakerId: vm.id },
      deps(sessao),
    );
    expect(r).toMatchObject({ ok: false, mensagem: 'Captação não encontrada.' });
  });

  it('edição com sobreposição retorna mensagem amigável', async () => {
    const vm = await criarUsuario();
    const r1 = await agendarFixture(vm.id, 8, 10);
    const r2 = await agendarFixture(vm.id, 12, 14);
    expect(r1.ok && r2.ok).toBe(true);

    const u = await criarUsuario();
    const sessao = sessaoDe(u.id, { gerenciarCaptacoes: true });

    // Tentar mover r2 para sobrepor r1
    const re = await executarAcao(
      defEditarCaptacao,
      { id: r2.dados!.id, startsAt: hora(9), endsAt: hora(11), videomakerId: vm.id },
      deps(sessao),
    );
    expect(re).toMatchObject({ ok: false, mensagem: 'Este videomaker já tem Captação neste horário.' });
  });
});

// ============================================================
// 3. Cancelar Captação
// ============================================================
describe('cancelarCaptacao', () => {
  it('cancela Captação Agendada com sucesso', async () => {
    const vm = await criarUsuario();
    const r = await agendarFixture(vm.id);
    expect(r.ok).toBe(true);

    const u = await criarUsuario();
    const rc = await executarAcao(
      defCancelarCaptacao,
      { id: r.dados!.id },
      deps(sessaoDe(u.id, { gerenciarCaptacoes: true })),
    );
    expect(rc).toMatchObject({ ok: true, mensagem: 'Captação cancelada.' });

    const [linha] = await sqlTeste()`SELECT status FROM captures WHERE id = ${r.dados!.id}`;
    expect(linha?.status).toBe('Cancelada');
  });

  it('cancelar Captação já Cancelada retorna erro de domínio', async () => {
    const vm = await criarUsuario();
    const r = await agendarFixture(vm.id);
    const u = await criarUsuario();
    const sessao = sessaoDe(u.id, { gerenciarCaptacoes: true });

    await executarAcao(defCancelarCaptacao, { id: r.dados!.id }, deps(sessao));
    const rc2 = await executarAcao(defCancelarCaptacao, { id: r.dados!.id }, deps(sessao));
    expect(rc2).toMatchObject({ ok: false, mensagem: 'Só é possível cancelar Captações Agendadas.' });
  });
});

// ============================================================
// 4. Vencida auto-completada na leitura
// ============================================================
describe('listarCaptacoes — auto-complete de vencidas', () => {
  it('Captação vencida retorna status Concluída e completedAt = endsAt, sem alterar o banco', async () => {
    const vm = await criarUsuario();
    // Insere diretamente com ends_at no passado
    const passado = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h atrás
    const inicio = new Date(passado.getTime() - 60 * 60 * 1000); // 3h atrás
    const u = await criarUsuario();
    await sqlTeste()`
      INSERT INTO captures (id, starts_at, ends_at, videomaker_id, created_by)
      VALUES ('VENC1', ${inicio}, ${passado}, ${vm.id}, ${u.id})
    `;

    const sessao = sessaoDe(u.id, { verCaptacoes: true });
    const captacoes = await listarCaptacoes(sqlTeste(), sessao);

    const vencida = captacoes.find((c) => c.id === 'VENC1');
    expect(vencida).toBeDefined();
    expect(vencida!.status).toBe('Concluída');
    expect(vencida!.completedAt?.getTime()).toBe(passado.getTime());

    // O banco ainda deve ter status 'Agendada'
    const [linha] = await sqlTeste()`SELECT status FROM captures WHERE id = 'VENC1'`;
    expect(linha?.status).toBe('Agendada');
  });

  it('obterCaptacao também auto-completa vencidas', async () => {
    const vm = await criarUsuario();
    const passado = new Date(Date.now() - 60 * 60 * 1000);
    const inicio = new Date(passado.getTime() - 60 * 60 * 1000);
    const u = await criarUsuario();
    await sqlTeste()`
      INSERT INTO captures (id, starts_at, ends_at, videomaker_id, created_by)
      VALUES ('VENC2', ${inicio}, ${passado}, ${vm.id}, ${u.id})
    `;

    const captacao = await obterCaptacao(sqlTeste(), 'VENC2');
    expect(captacao!.status).toBe('Concluída');
    expect(captacao!.completedAt?.getTime()).toBe(passado.getTime());
  });
});

// ============================================================
// 5. Job encerrarCaptacoesVencidas — idempotente
// ============================================================
describe('encerrarCaptacoesVencidas', () => {
  it('encerra Captações vencidas e retorna afetados correto', async () => {
    const vm1 = await criarUsuario();
    const vm2 = await criarUsuario();
    const u = await criarUsuario();
    const passado1 = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const inicio1 = new Date(passado1.getTime() - 60 * 60 * 1000);
    const passado2 = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const inicio2 = new Date(passado2.getTime() - 60 * 60 * 1000);

    await sqlTeste()`
      INSERT INTO captures (id, starts_at, ends_at, videomaker_id, created_by)
      VALUES ('JOB1', ${inicio1}, ${passado1}, ${vm1.id}, ${u.id}),
             ('JOB2', ${inicio2}, ${passado2}, ${vm2.id}, ${u.id})
    `;

    const resultado = await encerrarCaptacoesVencidas({ sql: sqlTeste(), agora: new Date() });
    expect(resultado.afetados).toBe(2);

    const [r] = await sqlTeste()`SELECT count(*)::int AS n FROM captures WHERE id IN ('JOB1', 'JOB2') AND status = 'Concluída'`;
    expect(r?.n).toBe(2);
  });

  it('idempotente: segunda execução não altera mais nenhuma linha', async () => {
    const vm = await criarUsuario();
    const u = await criarUsuario();
    const passado = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const inicio = new Date(passado.getTime() - 60 * 60 * 1000);

    await sqlTeste()`
      INSERT INTO captures (id, starts_at, ends_at, videomaker_id, created_by)
      VALUES ('IDEM1', ${inicio}, ${passado}, ${vm.id}, ${u.id})
    `;

    const r1 = await encerrarCaptacoesVencidas({ sql: sqlTeste(), agora: new Date() });
    expect(r1.afetados).toBe(1);

    const r2 = await encerrarCaptacoesVencidas({ sql: sqlTeste(), agora: new Date() });
    expect(r2.afetados).toBe(0);
  });

  it('não encerra Captações cujo fim ainda é futuro', async () => {
    const vm = await criarUsuario();
    const u = await criarUsuario();
    const futuro = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const inicio = new Date(Date.now() + 60 * 60 * 1000);

    await sqlTeste()`
      INSERT INTO captures (id, starts_at, ends_at, videomaker_id, created_by)
      VALUES ('FUT1', ${inicio}, ${futuro}, ${vm.id}, ${u.id})
    `;

    const resultado = await encerrarCaptacoesVencidas({ sql: sqlTeste(), agora: new Date() });
    expect(resultado.afetados).toBe(0);

    const [r] = await sqlTeste()`SELECT status FROM captures WHERE id = 'FUT1'`;
    expect(r?.status).toBe('Agendada');
  });
});

// ============================================================
// 6. Permissões
// ============================================================
describe('permissões', () => {
  it('Editor sem gerenciarCaptacoes não pode agendar', async () => {
    const vm = await criarUsuario();
    const u = await criarUsuario({ perfil: 'Editor' });
    // Editor tem verCaptacoes e gerenciarCaptacoes por padrão — removemos gerenciarCaptacoes
    const sessao = sessaoDe(u.id, { gerenciarCaptacoes: false });

    const r = await executarAcao(
      defAgendarCaptacao,
      { startsAt: hora(8), endsAt: hora(10), videomakerId: vm.id },
      deps(sessao),
    );
    expect(r).toMatchObject({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
  });

  it('Editor sem gerenciarCaptacoes não pode cancelar', async () => {
    const vm = await criarUsuario();
    const r = await agendarFixture(vm.id);
    expect(r.ok).toBe(true);

    const u = await criarUsuario({ perfil: 'Editor' });
    const sessao = sessaoDe(u.id, { gerenciarCaptacoes: false });

    const rc = await executarAcao(defCancelarCaptacao, { id: r.dados!.id }, deps(sessao));
    expect(rc).toMatchObject({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
  });

  it('Administrador pode agendar', async () => {
    const vm = await criarUsuario();
    const u = await criarUsuario({ perfil: 'Administrador' });
    const sessao: UsuarioSessao = {
      id: u.id,
      nome: 'Admin',
      perfil: 'Administrador',
      editorLabel: null,
      deveTrocarPin: false,
      permissoes: resolverPermissoes('Administrador', []),
      ehAprovadorDelegado: false,
    };

    const r = await executarAcao(
      defAgendarCaptacao,
      { startsAt: hora(8), endsAt: hora(10), videomakerId: vm.id },
      deps(sessao),
    );
    expect(r.ok).toBe(true);
  });
});
