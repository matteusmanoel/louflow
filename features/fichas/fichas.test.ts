import { describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import { resolverPermissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { defSalvarFichaTecnica } from './_acoes-def';
import { obterFichaTecnica } from './consultas';

usarBancoLimpo();

// ---- helpers de sessão -------------------------------------------------------

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

// ---- helpers de fixture ------------------------------------------------------

async function criarDemanda(criadorId: string): Promise<string> {
  const id = `LFTESTE${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  await sqlTeste()`
    INSERT INTO demands (id, title, format, created_by)
    VALUES (${id}, 'Demanda Teste', 'Reels', ${criadorId})
  `;
  return id;
}

const entradaValida = (demandaId: string) => ({
  demandaId,
  formato: 'Reels',
  duracaoSegundos: 60,
  plataformas: ['Instagram', 'TikTok'],
  briefing: 'Produzir um vídeo sobre destinos turísticos de Foz do Iguaçu.',
  observacoesTecnicas: 'Usar trilha sonora vibrante.',
});

// =============================================================================
// 1. salvarFichaTecnica — sucesso
// =============================================================================
describe('salvarFichaTecnica', () => {
  it('cria ficha técnica para uma demanda existente', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const sessao = sessaoDe(u.id, { editarDemandas: true });

    const r = await executarAcao(
      defSalvarFichaTecnica,
      entradaValida(demandaId),
      deps(sessao),
    );

    expect(r).toMatchObject({ ok: true, mensagem: 'Ficha técnica salva.' });
    expect(r.dados?.demandaId).toBe(demandaId);

    const ficha = await obterFichaTecnica(sqlTeste(), demandaId);
    expect(ficha).toBeTruthy();
    expect(ficha!.formato).toBe('Reels');
    expect(ficha!.duracaoSegundos).toBe(60);
    expect(ficha!.plataformas).toEqual(['Instagram', 'TikTok']);
    expect(ficha!.briefing).toBe('Produzir um vídeo sobre destinos turísticos de Foz do Iguaçu.');
    expect(ficha!.observacoesTecnicas).toBe('Usar trilha sonora vibrante.');
  });

  it('atualiza ficha técnica existente (upsert)', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const sessao = sessaoDe(u.id, { editarDemandas: true });

    // Primeira gravação
    await executarAcao(defSalvarFichaTecnica, entradaValida(demandaId), deps(sessao));

    // Segunda gravação com dados diferentes
    const r = await executarAcao(
      defSalvarFichaTecnica,
      { ...entradaValida(demandaId), formato: 'YouTube', duracaoSegundos: 120 },
      deps(sessao),
    );
    expect(r.ok).toBe(true);

    const ficha = await obterFichaTecnica(sqlTeste(), demandaId);
    expect(ficha!.formato).toBe('YouTube');
    expect(ficha!.duracaoSegundos).toBe(120);
  });

  it('registra histórico após salvar ficha técnica', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const sessao = sessaoDe(u.id, { editarDemandas: true });

    await executarAcao(defSalvarFichaTecnica, entradaValida(demandaId), deps(sessao));

    const [hist] = await sqlTeste()<{ action: string }[]>`
      SELECT action FROM history WHERE demand_id = ${demandaId} ORDER BY id DESC LIMIT 1
    `;
    expect(hist?.action).toBe('ficha_tecnica_salva');
  });

  it('retorna erro de domínio para demanda inexistente', async () => {
    const u = await criarUsuario();
    const sessao = sessaoDe(u.id, { editarDemandas: true });

    const r = await executarAcao(
      defSalvarFichaTecnica,
      { ...entradaValida('LFTESTE-INEXISTENTE'), demandaId: 'LFTESTE-INEXISTENTE' },
      deps(sessao),
    );
    expect(r).toMatchObject({ ok: false, mensagem: 'Demanda não encontrada.' });
  });

  it('schema rejeita plataformas vazia', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const sessao = sessaoDe(u.id, { editarDemandas: true });

    const r = await executarAcao(
      defSalvarFichaTecnica,
      { ...entradaValida(demandaId), plataformas: [] },
      deps(sessao),
    );
    expect(r).toMatchObject({ ok: false });
    expect(r.mensagem).toContain('plataforma');
  });

  it('schema rejeita duração zero ou negativa', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const sessao = sessaoDe(u.id, { editarDemandas: true });

    const r = await executarAcao(
      defSalvarFichaTecnica,
      { ...entradaValida(demandaId), duracaoSegundos: 0 },
      deps(sessao),
    );
    expect(r).toMatchObject({ ok: false });
  });
});

// =============================================================================
// 2. obterFichaTecnica
// =============================================================================
describe('obterFichaTecnica', () => {
  it('retorna null para demanda sem ficha técnica', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);

    const ficha = await obterFichaTecnica(sqlTeste(), demandaId);
    expect(ficha).toBeNull();
  });

  it('retorna ficha técnica para demanda existente', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const sessao = sessaoDe(u.id, { editarDemandas: true });

    await executarAcao(defSalvarFichaTecnica, entradaValida(demandaId), deps(sessao));

    const ficha = await obterFichaTecnica(sqlTeste(), demandaId);
    expect(ficha).not.toBeNull();
    expect(ficha!.demandaId).toBe(demandaId);
    expect(ficha!.plataformas).toEqual(['Instagram', 'TikTok']);
  });

  it('observacoesTecnicas é null quando não informado', async () => {
    const u = await criarUsuario();
    const demandaId = await criarDemanda(u.id);
    const sessao = sessaoDe(u.id, { editarDemandas: true });

    const { observacoesTecnicas: _obs, ...semObs } = entradaValida(demandaId);
    void _obs;
    await executarAcao(defSalvarFichaTecnica, semObs, deps(sessao));

    const ficha = await obterFichaTecnica(sqlTeste(), demandaId);
    expect(ficha!.observacoesTecnicas).toBeNull();
  });
});

// =============================================================================
// 3. Permissões
// =============================================================================
describe('permissões', () => {
  it('Editor sem editarDemandas não pode salvar ficha técnica', async () => {
    const u = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda(u.id);
    const sessao = sessaoDe(u.id, { editarDemandas: false });

    const r = await executarAcao(
      defSalvarFichaTecnica,
      entradaValida(demandaId),
      deps(sessao),
    );
    expect(r).toMatchObject({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
  });

  it('Administrador pode salvar ficha técnica', async () => {
    const u = await criarUsuario({ perfil: 'Administrador' });
    const demandaId = await criarDemanda(u.id);
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
      defSalvarFichaTecnica,
      entradaValida(demandaId),
      deps(sessao),
    );
    expect(r.ok).toBe(true);
  });

  it('usuário sem sessão não pode salvar ficha técnica', async () => {
    const r = await executarAcao(
      defSalvarFichaTecnica,
      entradaValida('QUALQUER'),
      { obterUsuario: async () => null, sql: sqlTeste },
    );
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('sessão');
  });
});
