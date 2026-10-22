import { describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import { resolverPermissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '../../tests/helpers/db';
import { defRegistrarUsoDrone, defEditarUsoDrone, defCancelarUsoDrone } from './actions';
import { listarUsosDrone, VALOR_USO_DRONE_REAIS } from './consultas';

usarBancoLimpo();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sessaoCom(id: string, operarDrone: boolean): UsuarioSessao {
  const perfil = operarDrone ? ('Administrador' as const) : ('Editor' as const);
  return {
    id,
    nome: 'Teste',
    perfil,
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: resolverPermissoes(perfil, []),
    ehAprovadorDelegado: false,
  };
}

const entradaBase = {
  used_on: '2026-10-15',
  responsible: 'Responsável Teste',
  served_profile: 'Editor',
  reason: 'Captação externa',
  location: 'Parque Nacional',
};

async function registrar(usuarioId: string, dados = entradaBase) {
  return executarAcao(
    defRegistrarUsoDrone,
    dados,
    { obterUsuario: async () => sessaoCom(usuarioId, true), sql: sqlTeste },
  );
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('registrarUsoDrone', () => {
  it('registra com permissão operarDrone', async () => {
    const u = await criarUsuario({ perfil: 'Administrador' });
    const r = await registrar(u.id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dados.id).toMatch(/^DR/);
  });

  it('rejeita sem permissão operarDrone', async () => {
    const u = await criarUsuario({ perfil: 'Editor' });
    const r = await executarAcao(
      defRegistrarUsoDrone,
      entradaBase,
      { obterUsuario: async () => sessaoCom(u.id, false), sql: sqlTeste },
    );
    expect(r.ok).toBe(false);
    expect(r.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);
  });

  it('rejeita data futura (regra de domínio, não restrição de banco)', async () => {
    const u = await criarUsuario({ perfil: 'Administrador' });
    const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const r = await registrar(u.id, { ...entradaBase, used_on: amanha });
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('data do uso não pode ser futura');
  });

  it('rejeita registro duplicado (mesmo responsável, data e demais campos com status Ativo)', async () => {
    const u = await criarUsuario({ perfil: 'Administrador' });
    const r1 = await registrar(u.id);
    expect(r1.ok).toBe(true);
    const r2 = await registrar(u.id); // mesmos dados → mesmo dedupe_key
    expect(r2.ok).toBe(false);
    expect(r2.mensagem).toContain('registro ativo idêntico');
  });
});

describe('editarUsoDrone', () => {
  it('edita com versão correta (concorrência otimista OK)', async () => {
    const u = await criarUsuario({ perfil: 'Administrador' });
    const criado = await registrar(u.id);
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;

    // Lê o updated_at atual para usar como versão
    const [linha] = await sqlTeste()<{ id: string; updated_at: Date }[]>`
      SELECT id, updated_at FROM drone_usages WHERE id = ${criado.dados.id}
    `;
    expect(linha).toBeDefined();
    const versao = linha!.updated_at.toISOString();

    const r = await executarAcao(
      defEditarUsoDrone,
      { ...entradaBase, id: criado.dados.id, versao, location: 'Novo local' },
      { obterUsuario: async () => sessaoCom(u.id, true), sql: sqlTeste },
    );
    expect(r.ok).toBe(true);

    // Verifica que o campo foi atualizado
    const [atualizado] = await sqlTeste()<{ location: string }[]>`
      SELECT location FROM drone_usages WHERE id = ${criado.dados.id}
    `;
    expect(atualizado?.location).toBe('Novo local');
  });

  it('rejeita edição com versão desatualizada (concorrência otimista — conflito)', async () => {
    const u = await criarUsuario({ perfil: 'Administrador' });
    const criado = await registrar(u.id);
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;

    // Versão proposital desatualizada
    const versaoAntiga = new Date(0).toISOString();

    const r = await executarAcao(
      defEditarUsoDrone,
      { ...entradaBase, id: criado.dados.id, versao: versaoAntiga, location: 'Tentativa inválida' },
      { obterUsuario: async () => sessaoCom(u.id, true), sql: sqlTeste },
    );
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain('alterado por outro usuário');
  });
});

describe('cancelarUsoDrone', () => {
  it('cancela: muda status para Cancelado e preserva o registro', async () => {
    const u = await criarUsuario({ perfil: 'Administrador' });
    const criado = await registrar(u.id);
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;

    const r = await executarAcao(
      defCancelarUsoDrone,
      { id: criado.dados.id },
      { obterUsuario: async () => sessaoCom(u.id, true), sql: sqlTeste },
    );
    expect(r.ok).toBe(true);

    // Registro ainda existe com status Cancelado
    const [linha] = await sqlTeste()<{ status: string }[]>`
      SELECT status FROM drone_usages WHERE id = ${criado.dados.id}
    `;
    expect(linha?.status).toBe('Cancelado');
  });

  it('permite registrar mesmo dedupe_key após cancelamento do original', async () => {
    const u = await criarUsuario({ perfil: 'Administrador' });
    const criado = await registrar(u.id);
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;

    await executarAcao(defCancelarUsoDrone, { id: criado.dados.id }, {
      obterUsuario: async () => sessaoCom(u.id, true), sql: sqlTeste,
    });

    // Após cancelamento, o índice único só bloqueia status='Ativo' — novo registro deve passar
    const r = await registrar(u.id);
    expect(r.ok).toBe(true);
  });
});

describe('listarUsosDrone', () => {
  it('retorna lista vazia e total zero quando não há registros', async () => {
    const resultado = await listarUsosDrone(sqlTeste());
    expect(resultado.usos).toHaveLength(0);
    expect(resultado.totalAtivosReais).toBe(0);
  });

  it('calcula total: R$ 250 × quantidade de registros Ativos', async () => {
    const u = await criarUsuario({ perfil: 'Administrador' });

    await registrar(u.id, { ...entradaBase, used_on: '2026-09-01', reason: 'Uso 1' });
    await registrar(u.id, { ...entradaBase, used_on: '2026-09-02', reason: 'Uso 2' });
    const terceiro = await registrar(u.id, { ...entradaBase, used_on: '2026-09-03', reason: 'Uso 3' });

    // Cancela o terceiro
    if (terceiro.ok) {
      await executarAcao(defCancelarUsoDrone, { id: terceiro.dados.id }, {
        obterUsuario: async () => sessaoCom(u.id, true), sql: sqlTeste,
      });
    }

    const resultado = await listarUsosDrone(sqlTeste());
    expect(resultado.usos).toHaveLength(3); // cancelado ainda aparece
    // Apenas 2 ativos × R$ 250
    expect(resultado.totalAtivosReais).toBe(2 * VALOR_USO_DRONE_REAIS);
  });
});
