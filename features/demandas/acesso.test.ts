import { describe, expect, it } from 'vitest';
import { resolverPermissoes, type Perfil } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import {
  DESTINO_SEM_ACESSO_DEMANDA,
  REGRAS_ACESSO_DEMANDA,
  avaliarAcessoDemanda,
  exigirAcessoDemanda,
  garantirAcessoDemanda,
  podeVerDemanda,
} from './acesso';

usarBancoLimpo();

const sessao = (id: string, perfil: Perfil, extras: Partial<UsuarioSessao['permissoes']> = {}): UsuarioSessao => ({
  id,
  nome: 'Teste',
  perfil,
  editorLabel: null,
  deveTrocarPin: false,
  permissoes: { ...resolverPermissoes(perfil, []), ...extras },
  ehAprovadorDelegado: false,
});

async function demanda(opcoes: { editorId?: string | null; influencerId?: string | null; formato?: string; id?: string }) {
  const id = opcoes.id ?? `LFACESSO${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  await sqlTeste()`
    INSERT INTO demands (id, title, format, status, priority, editor_id, influencer_id)
    VALUES (${id}, 'Demanda', ${opcoes.formato ?? 'Reels'}, 'Não iniciada', 'Normal', ${opcoes.editorId ?? null}, ${opcoes.influencerId ?? null})`;
  return id;
}

async function cenario() {
  const editor = await criarUsuario({ perfil: 'Editor' });
  const outroEditor = await criarUsuario({ perfil: 'Editor' });
  const influencer = await criarUsuario({ perfil: 'Influencer' });
  const outroInfluencer = await criarUsuario({ perfil: 'Influencer' });
  const admin = await criarUsuario({ perfil: 'Administrador' });
  const premios = await criarUsuario({ perfil: 'Premios' });
  const delegado = await criarUsuario({ perfil: 'Influencer' });
  const delegadoOutro = await criarUsuario({ perfil: 'Influencer' });
  await sqlTeste()`INSERT INTO approval_delegations (approver_id, editor_id) VALUES (${delegado.id}, ${editor.id}), (${delegadoOutro.id}, ${outroEditor.id})`;
  const id = await demanda({ editorId: editor.id, influencerId: influencer.id });
  return { editor, outroEditor, influencer, outroInfluencer, admin, premios, delegado, delegadoOutro, id };
}

describe('acesso à Demanda: matriz permitido/negado (chamada direta)', () => {
  it('permite Administrador, quem tem verTodasDemandas, Editor responsável, Influencer solicitante e Aprovador delegado do Editor', async () => {
    const c = await cenario();
    const sql = sqlTeste();
    expect(await podeVerDemanda(sql, sessao(c.admin.id, 'Administrador'), c.id)).toBe(true);
    expect(await podeVerDemanda(sql, sessao(c.outroEditor.id, 'Editor', { verTodasDemandas: true }), c.id)).toBe(true);
    expect(await podeVerDemanda(sql, sessao(c.editor.id, 'Editor'), c.id)).toBe(true);
    expect(await podeVerDemanda(sql, sessao(c.influencer.id, 'Influencer'), c.id)).toBe(true);
    expect(await podeVerDemanda(sql, sessao(c.delegado.id, 'Influencer'), c.id)).toBe(true);
  });

  it('nega Editor de outra equipe, Influencer de outra Demanda, Aprovador delegado de outro Editor e Prêmios', async () => {
    const c = await cenario();
    const sql = sqlTeste();
    expect(await podeVerDemanda(sql, sessao(c.outroEditor.id, 'Editor'), c.id)).toBe(false);
    expect(await podeVerDemanda(sql, sessao(c.outroInfluencer.id, 'Influencer'), c.id)).toBe(false);
    expect(await podeVerDemanda(sql, sessao(c.delegadoOutro.id, 'Influencer'), c.id)).toBe(false);
    expect(await podeVerDemanda(sql, sessao(c.premios.id, 'Premios'), c.id)).toBe(false);
  });

  it('Demanda inexistente nunca é visível', async () => {
    const c = await cenario();
    expect(await podeVerDemanda(sqlTeste(), sessao(c.admin.id, 'Administrador'), 'LFNAOEXISTE')).toBe(false);
  });

  it('informa qual regra permitiu', async () => {
    const c = await cenario();
    const alvo = { id: c.id, editor_id: c.editor.id, influencer_id: c.influencer.id, format: 'Reels' };
    expect(await avaliarAcessoDemanda(sqlTeste(), sessao(c.editor.id, 'Editor'), alvo)).toEqual({ permitido: true, regra: 'editor-responsavel' });
    expect(await avaliarAcessoDemanda(sqlTeste(), sessao(c.delegado.id, 'Influencer'), alvo)).toEqual({ permitido: true, regra: 'aprovador-delegado' });
    expect(REGRAS_ACESSO_DEMANDA.map((r) => r.nome)).toEqual([
      'administrador',
      'ver-todas-demandas',
      'editor-responsavel',
      'influencer-solicitante',
      'aprovador-delegado',
      'editor-da-fila',
    ]);
  });
});

describe('acesso à Demanda: Fila de Fichas (sem Editor)', () => {
  it('qualquer Editor vê a Demanda sem Editor; Influencer de outra pessoa e Prêmios não', async () => {
    const c = await cenario();
    const naFila = await demanda({ editorId: null, influencerId: c.influencer.id, formato: 'Ficha técnica' });
    const sql = sqlTeste();
    expect(await podeVerDemanda(sql, sessao(c.outroEditor.id, 'Editor'), naFila)).toBe(true);
    expect(await podeVerDemanda(sql, sessao(c.editor.id, 'Editor'), naFila)).toBe(true);
    expect(await podeVerDemanda(sql, sessao(c.influencer.id, 'Influencer'), naFila)).toBe(true); // é o solicitante
    expect(await podeVerDemanda(sql, sessao(c.outroInfluencer.id, 'Influencer'), naFila)).toBe(false);
    expect(await podeVerDemanda(sql, sessao(c.premios.id, 'Premios'), naFila)).toBe(false);
  });

  it('Cortes sem Editor não entra na Fila; com Editor atribuído a Fila deixa de valer', async () => {
    const c = await cenario();
    const cortes = await demanda({ editorId: null, formato: 'Cortes' });
    expect(await podeVerDemanda(sqlTeste(), sessao(c.outroEditor.id, 'Editor'), cortes)).toBe(false);
    const atribuida = await demanda({ editorId: c.editor.id, formato: 'Ficha técnica' });
    expect(await podeVerDemanda(sqlTeste(), sessao(c.outroEditor.id, 'Editor'), atribuida)).toBe(false);
  });
});

describe('acesso à Demanda: garantirAcessoDemanda e exigirAcessoDemanda', () => {
  it('garantir lança ErroDominio para quem não pode e para id inexistente; permite quem pode', async () => {
    const c = await cenario();
    const sql = sqlTeste();
    await expect(garantirAcessoDemanda(sql, sessao(c.outroEditor.id, 'Editor'), c.id)).rejects.toMatchObject({
      name: 'ErroDominio',
      message: 'Você não tem permissão para esta Demanda.',
    });
    await expect(garantirAcessoDemanda(sql, sessao(c.editor.id, 'Editor'), 'LFNAOEXISTE')).rejects.toMatchObject({
      message: 'Demanda não encontrada.',
    });
    await expect(garantirAcessoDemanda(sql, sessao(c.editor.id, 'Editor'), c.id)).resolves.toBeUndefined();
  });

  it('exigir (páginas) redireciona para /demandas com o aviso de permissão e não redireciona quem pode', async () => {
    const c = await cenario();
    sqlTeste();
    const alvo = { id: c.id, editor_id: c.editor.id, influencer_id: c.influencer.id, format: 'Reels' };
    await expect(exigirAcessoDemanda(sessao(c.outroEditor.id, 'Editor'), alvo)).rejects.toMatchObject({
      digest: expect.stringContaining(DESTINO_SEM_ACESSO_DEMANDA),
    });
    expect(DESTINO_SEM_ACESSO_DEMANDA).toBe('/demandas?aviso=sem-permissao');
    await expect(exigirAcessoDemanda(sessao(c.editor.id, 'Editor'), alvo)).resolves.toBeUndefined();
  });
});
