import { describe, expect, it } from 'vitest';
import { CHAVES_PERMISSAO, permissoesPadrao, resolverPermissoes } from '@/lib/permissions';
import { MODULOS, modulosPermitidos, rotaInicial } from '@/lib/modules';
import type { UsuarioSessao } from '@/lib/session';

const usuario = (perfil: UsuarioSessao['perfil'], concessoes = [] as Parameters<typeof resolverPermissoes>[1]): UsuarioSessao => ({
  id: 'u1',
  nome: 'Teste',
  perfil,
  editorLabel: null,
  deveTrocarPin: false,
  permissoes: resolverPermissoes(perfil, concessoes),
  ehAprovadorDelegado: false,
});

describe('permissões padrão por Perfil', () => {
  it('Administrador recebe tudo exceto designações', () => {
    const p = permissoesPadrao('Administrador');
    for (const c of CHAVES_PERMISSAO) expect(p[c]).toBe(c !== 'editorPadraoCortes');
  });

  it('Prêmios só vê Sorteios e ignora concessões individuais', () => {
    const p = resolverPermissoes('Premios', [{ chave: 'criarDemandas', concedida: true }]);
    expect(Object.entries(p).filter(([, v]) => v).map(([k]) => k)).toEqual(['verSorteios']);
  });

  it('Editor e Influencer seguem o padrão legado', () => {
    const editor = permissoesPadrao('Editor');
    expect(editor.gerenciarCaptacoes && editor.verCaptacoes && editor.verSorteios).toBe(true);
    expect(editor.criarDemandas).toBe(false);
    const influencer = permissoesPadrao('Influencer');
    expect(influencer.enviarFicha && influencer.gerenciarAgenda).toBe(true);
    expect(influencer.verCaptacoes).toBe(false);
  });
});

describe('concessões individuais', () => {
  it('somam e retiram do padrão para Editor', () => {
    const p = resolverPermissoes('Editor', [
      { chave: 'acessarCortes', concedida: true },
      { chave: 'gerenciarCaptacoes', concedida: false },
    ]);
    expect(p.acessarCortes).toBe(true);
    expect(p.gerenciarCaptacoes).toBe(false);
  });

  it('Administrador ignora retiradas, mas aceita designação', () => {
    const p = resolverPermissoes('Administrador', [
      { chave: 'gerenciarUsuarios', concedida: false },
      { chave: 'editorPadraoCortes', concedida: true },
    ]);
    expect(p.gerenciarUsuarios).toBe(true);
    expect(p.editorPadraoCortes).toBe(true);
  });
});

describe('menu por Permissão', () => {
  it('Prêmios só enxerga Sorteios e começa nele', () => {
    const u = usuario('Premios');
    expect(modulosPermitidos(u).map((m) => m.slug)).toEqual(['sorteios']);
    expect(rotaInicial(u)).toBe('/sorteios');
  });

  it('Editor não enxerga Usuários nem Lixeira', () => {
    const slugs = modulosPermitidos(usuario('Editor')).map((m) => m.slug);
    expect(slugs).toContain('captacoes');
    expect(slugs).not.toContain('usuarios');
    expect(slugs).not.toContain('lixeira');
  });

  it('todo módulo tem uma fatia dona declarada', () => {
    for (const m of MODULOS) expect(m.fatia).toMatch(/^S\d-\d{2}/);
  });
});
