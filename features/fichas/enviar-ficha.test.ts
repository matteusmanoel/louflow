import { describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import { resolverPermissoes, type Perfil, type Permissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { listarFilaDeFichas } from '@/features/demandas/consultas';
import { defEnviarFichaTecnica, defSalvarFichaTecnica } from './_acoes-def';
import { obterFichaEnviada, podeLerFichaEnviada } from './consultas';

usarBancoLimpo();

function sessao(id: string, perfil: Perfil, ajuste: Partial<Permissoes> = {}): UsuarioSessao {
  return {
    id,
    nome: 'Teste',
    perfil,
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: { ...resolverPermissoes(perfil, []), ...ajuste },
    ehAprovadorDelegado: false,
  };
}

const deps = (u: UsuarioSessao) => ({ obterUsuario: async () => u, sql: () => sqlTeste() });

const FICHA = {
  identificacao: 'Roteiro do passeio de catamarã',
  observacaoEditor: 'Cortar a abertura longa.',
  previsaoPublicacao: '2026-12-01',
  roteiro: 'Cena 1: porto.',
  cabeca: 'Hoje vamos a bordo.',
  sonora: 'Fala do capitão.',
  informacoes: 'Saída às 9h.',
  linkArquivos: 'https://drive.exemplo.test/ficha/1',
  roteiroEscrito: 'Texto completo.',
  gcLettering: 'Catamarã do Rio',
  materialSsd: 'SSD 3',
  plataforma: 'Instagram',
  formatoConteudo: 'Reels',
  referenciasVisuais: 'https://exemplo.test/ref',
};

async function contagens() {
  const sql = sqlTeste();
  const [d] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM demands`;
  const [t] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM technical_sheets`;
  return { demandas: d!.n, fichas: t!.n };
}

describe('enviarFichaTecnica (PRD §4.5)', () => {
  it('o Influencer envia a ficha e nasce a Demanda Ficha técnica, Não iniciada, na Fila de Fichas', async () => {
    const inf = await criarUsuario({ perfil: 'Influencer' });
    const ed = await criarUsuario({ perfil: 'Editor' });

    const res = await executarAcao(
      defEnviarFichaTecnica,
      { ...FICHA, chaveEnvio: crypto.randomUUID(), editorSugeridoId: ed.id },
      deps(sessao(inf.id, 'Influencer')),
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const sql = sqlTeste();
    const [d] = await sql<Record<string, unknown>[]>`SELECT * FROM demands WHERE id = ${res.dados.demandaId}`;
    expect(d).toMatchObject({
      title: FICHA.identificacao,
      format: 'Ficha técnica',
      status: 'Não iniciada',
      influencer_id: inf.id,
      editor_id: null,
      created_by: inf.id,
      info: FICHA.observacaoEditor,
      link: FICHA.linkArquivos,
    });
    const [t] = await sql<Record<string, unknown>[]>`SELECT * FROM technical_sheets WHERE demand_id = ${res.dados.demandaId}`;
    expect(t).toMatchObject({
      identification: FICHA.identificacao,
      editor_note: FICHA.observacaoEditor,
      script: FICHA.roteiro,
      opening: FICHA.cabeca,
      sound_bite: FICHA.sonora,
      information: FICHA.informacoes,
      files_link: FICHA.linkArquivos,
      written_script: FICHA.roteiroEscrito,
      gc_lettering: FICHA.gcLettering,
      ssd_material: FICHA.materialSsd,
      platform: FICHA.plataforma,
      content_format: FICHA.formatoConteudo,
      visual_references: FICHA.referenciasVisuais,
      suggested_editor_id: ed.id,
      sent_by: inf.id,
    });
    const historico = await sql<{ action: string }[]>`SELECT action FROM history WHERE demand_id = ${res.dados.demandaId} ORDER BY id`;
    expect(historico.map((h) => h.action)).toEqual(['Demanda criada', 'ficha_tecnica_enviada']);

    const fila = await listarFilaDeFichas(sql);
    expect(fila.map((x) => x.id)).toContain(res.dados.demandaId);
  });

  it('o Influencer é sempre a Sessão: influencer_id, editor, status e formato da entrada são descartados', async () => {
    const inf = await criarUsuario({ perfil: 'Influencer' });
    const outro = await criarUsuario({ perfil: 'Influencer' });
    const ed = await criarUsuario({ perfil: 'Editor' });

    const res = await executarAcao(
      defEnviarFichaTecnica,
      {
        ...FICHA,
        influencer_id: outro.id,
        influencerId: outro.id,
        sent_by: outro.id,
        editor_id: ed.id,
        status: 'Em execução',
        format: 'Reels',
        priority: 'Urgente',
      },
      deps(sessao(inf.id, 'Influencer')),
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const sql = sqlTeste();
    const [d] = await sql<{ influencer_id: string; editor_id: string | null; status: string; format: string; priority: string; created_by: string }[]>`
      SELECT influencer_id, editor_id, status, format, priority, created_by FROM demands WHERE id = ${res.dados.demandaId}`;
    expect(d).toMatchObject({ influencer_id: inf.id, editor_id: null, status: 'Não iniciada', format: 'Ficha técnica', priority: 'Normal', created_by: inf.id });
    const [t] = await sql<{ sent_by: string }[]>`SELECT sent_by FROM technical_sheets WHERE demand_id = ${res.dados.demandaId}`;
    expect(t!.sent_by).toBe(inf.id);
    const [doOutro] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM demands WHERE influencer_id = ${outro.id}`;
    expect(doOutro!.n).toBe(0);
  });

  it('só o Influencer com enviarFicha envia: Editor (mesmo com a chave), Administrador, Prêmios e Influencer sem a chave são recusados', async () => {
    const inf = await criarUsuario({ perfil: 'Influencer' });
    const ed = await criarUsuario({ perfil: 'Editor' });
    const adm = await criarUsuario({ perfil: 'Administrador' });
    const premios = await criarUsuario({ perfil: 'Premios' });
    const antes = await contagens();

    const tentativas = [
      sessao(ed.id, 'Editor'),
      sessao(ed.id, 'Editor', { enviarFicha: true }),
      sessao(adm.id, 'Administrador'),
      sessao(premios.id, 'Premios'),
      sessao(inf.id, 'Influencer', { enviarFicha: false }),
    ];
    for (const u of tentativas) {
      const res = await executarAcao(defEnviarFichaTecnica, FICHA, deps(u));
      expect(res, `${u.perfil}/${u.permissoes.enviarFicha}`).toEqual({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
    }
    expect(await contagens()).toEqual(antes);
  });

  it('não concede editarDemandas: o Influencer segue sem editar a ficha nem a Demanda de ninguém', async () => {
    const inf = await criarUsuario({ perfil: 'Influencer' });
    expect(resolverPermissoes('Influencer', []).editarDemandas).toBe(false);

    const res = await executarAcao(defEnviarFichaTecnica, FICHA, deps(sessao(inf.id, 'Influencer')));
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const salvar = await executarAcao(
      defSalvarFichaTecnica,
      { demandaId: res.dados.demandaId, formato: 'Reels', duracaoSegundos: 30, plataformas: ['Instagram'], briefing: 'x' },
      deps(sessao(inf.id, 'Influencer')),
    );
    expect(salvar).toEqual({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
  });

  it('recusa Editor sugerido que não é Editor ativo e não cria nada', async () => {
    const inf = await criarUsuario({ perfil: 'Influencer' });
    const inativo = await criarUsuario({ perfil: 'Editor', ativo: false });
    const antes = await contagens();
    for (const editorSugeridoId of [inf.id, inativo.id, crypto.randomUUID()]) {
      const res = await executarAcao(defEnviarFichaTecnica, { ...FICHA, editorSugeridoId }, deps(sessao(inf.id, 'Influencer')));
      expect(res).toEqual({ ok: false, mensagem: 'Editor sugerido inválido.' });
    }
    expect(await contagens()).toEqual(antes);
  });

  it('valida identificação, link, data e tamanho', async () => {
    const inf = await criarUsuario({ perfil: 'Influencer' });
    const antes = await contagens();
    const invalidos = [
      { ...FICHA, identificacao: '   ' },
      { ...FICHA, linkArquivos: 'javascript:alert(1)' },
      { ...FICHA, linkArquivos: 'ftp://exemplo.test/x' },
      { ...FICHA, previsaoPublicacao: '2026-02-31' },
      { ...FICHA, roteiro: 'x'.repeat(5001) },
      { ...FICHA, chaveEnvio: 'não-é-uuid' },
    ];
    for (const entrada of invalidos) {
      const res = await executarAcao(defEnviarFichaTecnica, entrada, deps(sessao(inf.id, 'Influencer')));
      expect(res.ok).toBe(false);
    }
    expect(await contagens()).toEqual(antes);
  });

  it('só a identificação é obrigatória; campos vazios viram nulos', async () => {
    const inf = await criarUsuario({ perfil: 'Influencer' });
    const res = await executarAcao(
      defEnviarFichaTecnica,
      { identificacao: 'Só o título', linkArquivos: '', previsaoPublicacao: '', editorSugeridoId: '', roteiro: '' },
      deps(sessao(inf.id, 'Influencer')),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const [t] = await sqlTeste()<{ files_link: string | null; expected_publication: Date | null; script: string | null; suggested_editor_id: string | null }[]>`
      SELECT files_link, expected_publication, script, suggested_editor_id FROM technical_sheets WHERE demand_id = ${res.dados.demandaId}`;
    expect(t).toEqual({ files_link: null, expected_publication: null, script: null, suggested_editor_id: null });
  });

  it('é idempotente por chave de envio, e a chave de outra pessoa nunca devolve a Demanda dela', async () => {
    const inf = await criarUsuario({ perfil: 'Influencer' });
    const outro = await criarUsuario({ perfil: 'Influencer' });
    const chaveEnvio = crypto.randomUUID();

    const primeira = await executarAcao(defEnviarFichaTecnica, { ...FICHA, chaveEnvio }, deps(sessao(inf.id, 'Influencer')));
    const repetida = await executarAcao(defEnviarFichaTecnica, { ...FICHA, chaveEnvio }, deps(sessao(inf.id, 'Influencer')));
    expect(primeira.ok && repetida.ok).toBe(true);
    if (!primeira.ok || !repetida.ok) return;
    expect(repetida.dados.demandaId).toBe(primeira.dados.demandaId);
    expect((await contagens()).demandas).toBe(1);

    const alheia = await executarAcao(defEnviarFichaTecnica, { ...FICHA, chaveEnvio }, deps(sessao(outro.id, 'Influencer')));
    expect(alheia).toEqual({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
    expect(JSON.stringify(alheia)).not.toContain(primeira.dados.demandaId);
    expect((await contagens()).demandas).toBe(1);
  });
});

describe('leitura da ficha enviada: conferida no servidor', () => {
  async function enviada() {
    const inf = await criarUsuario({ perfil: 'Influencer' });
    const res = await executarAcao(defEnviarFichaTecnica, FICHA, deps(sessao(inf.id, 'Influencer')));
    if (!res.ok) throw new Error('envio falhou');
    return { inf, demandaId: res.dados.demandaId };
  }

  it('lê o Influencer que enviou, o Administrador e qualquer Editor enquanto está na Fila', async () => {
    const { inf, demandaId } = await enviada();
    const ed = await criarUsuario({ perfil: 'Editor' });
    const adm = await criarUsuario({ perfil: 'Administrador' });
    const sql = sqlTeste();
    for (const u of [sessao(inf.id, 'Influencer'), sessao(adm.id, 'Administrador'), sessao(ed.id, 'Editor')]) {
      const ficha = await obterFichaEnviada(sql, demandaId, u);
      expect(ficha, u.perfil).toMatchObject({ identificacao: FICHA.identificacao, roteiro: FICHA.roteiro, linkArquivos: FICHA.linkArquivos });
    }
  });

  it('não lê outro Influencer, Prêmios, nem Editor de fora depois que a Demanda tem Editor', async () => {
    const { inf, demandaId } = await enviada();
    const dono = await criarUsuario({ perfil: 'Editor' });
    const fora = await criarUsuario({ perfil: 'Editor' });
    const outroInf = await criarUsuario({ perfil: 'Influencer' });
    const premios = await criarUsuario({ perfil: 'Premios' });
    const sql = sqlTeste();
    await sql`UPDATE demands SET editor_id = ${dono.id} WHERE id = ${demandaId}`;

    expect(await obterFichaEnviada(sql, demandaId, sessao(dono.id, 'Editor'))).not.toBeNull();
    expect(await obterFichaEnviada(sql, demandaId, sessao(inf.id, 'Influencer'))).not.toBeNull();
    for (const u of [sessao(fora.id, 'Editor'), sessao(outroInf.id, 'Influencer'), sessao(premios.id, 'Premios')]) {
      expect(await obterFichaEnviada(sql, demandaId, u), u.perfil).toBeNull();
    }
  });

  it('a regra de leitura é pura e cobre a Fila só para formato Ficha técnica', () => {
    const editor = sessao('e1', 'Editor');
    expect(podeLerFichaEnviada(editor, { influencer_id: 'i1', editor_id: null, format: 'Ficha técnica' })).toBe(true);
    expect(podeLerFichaEnviada(editor, { influencer_id: 'i1', editor_id: null, format: 'Reels' })).toBe(false);
    expect(podeLerFichaEnviada(editor, { influencer_id: 'i1', editor_id: 'e2', format: 'Ficha técnica' })).toBe(false);
  });
});
