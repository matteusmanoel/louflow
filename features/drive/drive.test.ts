import { beforeEach, describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import { montarChave, urlDoObjeto } from '@/lib/armazenamento-chave';
import { resolverPermissoes, type Perfil } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { listarArquivosDemanda } from '@/features/arquivos/consultas';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '../../tests/helpers/db';
import {
  MSG_CICLO,
  MSG_COTA,
  MSG_ENTREGA,
  MSG_NOME,
  MSG_PASTA_FIXA,
  MSG_SEM_ACESSO,
} from './acesso';
import {
  defConfirmarUploads,
  defCriarPasta,
  defEnviarLixeira,
  defMover,
  defRenomear,
  defRestaurar,
} from './acoes-def';
import { abrirPasta, listarRaiz } from './consultas';
import { expurgarVencidos } from './expurgo';
import { LIMITE_ZIP_BYTES, MSG_ZIP, MSG_ZIP_VAZIO, avaliarVolumeZip } from './zip';

usarBancoLimpo();

const BUCKET = 'louflow-app-private-796576080439';
const REGIAO = 'us-east-1';
let sequencia = 0;

beforeEach(() => {
  delete process.env.S3_BUCKET;
  delete process.env.AWS_REGION;
  delete process.env.DRIVE_COTA_BYTES;
});

function sessao(id: string, perfil: Perfil, extra: Partial<UsuarioSessao['permissoes']> = {}): UsuarioSessao {
  return {
    id,
    nome: 'Teste',
    perfil,
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: { ...resolverPermissoes(perfil, []), ...extra },
    ehAprovadorDelegado: false,
  };
}

function deps(usuario: UsuarioSessao) {
  return { obterUsuario: async () => usuario, sql: sqlTeste };
}

async function criarDemanda(opcoes: {
  editorId?: string | null;
  influencerId?: string | null;
  titulo?: string;
  naLixeira?: boolean;
} = {}) {
  sequencia += 1;
  const id = `LF${String(sequencia).padStart(10, '0')}`;
  await sqlTeste()`
    INSERT INTO demands (id, title, format, status, priority, editor_id, influencer_id, deleted_at)
    VALUES (
      ${id},
      ${opcoes.titulo ?? `Demanda ${sequencia}`},
      'Vídeo',
      'Em execução',
      'Normal',
      ${opcoes.editorId ?? null},
      ${opcoes.influencerId ?? null},
      ${opcoes.naLixeira ? new Date() : null}
    )`;
  return id;
}

async function gravarArquivo(demandaId: string, usuarioId: string, nome: string, entregaId: string | null = null) {
  sequencia += 1;
  const id = `AR${String(sequencia).padStart(10, '0')}`;
  await sqlTeste()`
    INSERT INTO demand_files (id, demand_id, delivery_id, url, file_name, content_type, byte_size, created_by)
    VALUES (
      ${id}, ${demandaId}, ${entregaId}, ${`https://exemplo.test/${nome}`}, ${nome}, 'image/jpeg', 10, ${usuarioId}
    )`;
  return id;
}

async function criarCorte(editorId: string, titulo: string) {
  sequencia += 1;
  const id = `CL${String(sequencia).padStart(10, '0')}`;
  await sqlTeste()`
    INSERT INTO clips (id, title, editor_id, post_date, editorial_line, source_program, status, created_by)
    VALUES (${id}, ${titulo}, ${editorId}, '2026-12-01', 'Viral', 'Descubra Foz', 'Em andamento', ${editorId})`;
  return id;
}

describe('Drive', () => {
  it('mostra a Demanda visível, inclusive vazia, e esconde a alheia e a lixeira', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const { id: outroId } = await criarUsuario({ perfil: 'Editor' });
    const comoEditor = await criarDemanda({ editorId, titulo: 'Minha' });
    const vazia = await criarDemanda({ editorId, titulo: 'Vazia' });
    const alheia = await criarDemanda({ editorId: outroId, titulo: 'Alheia' });
    const lixeira = await criarDemanda({ titulo: 'Na lixeira', naLixeira: true });
    await gravarArquivo(comoEditor, editorId, 'minha.jpg');
    await gravarArquivo(alheia, outroId, 'alheia.jpg');

    const usuario = sessao(editorId, 'Editor');
    const ids = (await listarRaiz(usuario)).itens.map((item) => item.id);
    expect(ids).toContain(comoEditor);
    expect(ids).toContain(vazia);
    expect(ids).not.toContain(alheia);
    expect(ids).not.toContain(lixeira);
    expect(await abrirPasta(usuario, alheia)).toBeNull();
    expect(await abrirPasta(usuario, lixeira)).toBeNull();
    expect((await abrirPasta(usuario, comoEditor))?.itens.map((item) => item.nome)).toEqual(['minha.jpg']);
    expect((await abrirPasta(usuario, vazia))?.itens).toEqual([]);
  });

  it('mostra Corte só para quem vê a aba, e a pasta livre para a equipe', async () => {
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const corte = await criarCorte(adminId, 'Corte da equipe');
    const criada = await executarAcao(defCriarPasta, { pastaId: null, nome: 'Brutos' }, deps(sessao(editorId, 'Editor')));
    expect(criada.ok).toBe(true);

    const doEditor = (await listarRaiz(sessao(editorId, 'Editor'))).itens.map((item) => item.id);
    expect(doEditor).not.toContain(corte);
    const doAdmin = (await listarRaiz(sessao(adminId, 'Administrador'))).itens;
    expect(doAdmin.map((item) => item.id)).toContain(corte);
    expect(doAdmin.map((item) => item.nome)).toContain('Brutos');
  });

  it('nega Prêmios e a pasta de Demanda alheia', async () => {
    const { id: premiosId } = await criarUsuario({ perfil: 'Premios' });
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const { id: outroId } = await criarUsuario({ perfil: 'Editor' });
    const alheia = await criarDemanda({ editorId: outroId, titulo: 'Alheia' });

    const negado = await executarAcao(defCriarPasta, { pastaId: null, nome: 'X' }, deps(sessao(premiosId, 'Premios')));
    expect(negado.ok).toBe(false);
    if (!negado.ok) expect(negado.mensagem).toBe(MENSAGEM_SEM_PERMISSAO);

    const fora = await executarAcao(defCriarPasta, { pastaId: alheia, nome: 'Dentro' }, deps(sessao(editorId, 'Editor')));
    expect(fora).toMatchObject({ ok: false, mensagem: MSG_SEM_ACESSO });
  });

  it('recusa nome repetido, renomeia e impede ciclo', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const usuario = sessao(editorId, 'Editor');
    const primeira = await executarAcao(defCriarPasta, { pastaId: null, nome: 'Origem' }, deps(usuario));
    const repetida = await executarAcao(defCriarPasta, { pastaId: null, nome: 'origem' }, deps(usuario));
    expect(repetida).toMatchObject({ ok: false, mensagem: MSG_NOME });
    if (!primeira.ok || !primeira.dados) throw new Error('pasta');
    const filha = await executarAcao(defCriarPasta, { pastaId: primeira.dados.id, nome: 'Filha' }, deps(usuario));
    if (!filha.ok || !filha.dados) throw new Error('filha');

    const nome = await executarAcao(defRenomear, { id: filha.dados.id, nome: 'Interna' }, deps(usuario));
    expect(nome.ok).toBe(true);
    expect((await abrirPasta(usuario, primeira.dados.id))?.itens.map((item) => item.nome)).toEqual(['Interna']);

    const fixa = await criarDemanda({ editorId, titulo: 'Fixa' });
    const alterarFixa = await executarAcao(defRenomear, { id: fixa, nome: 'Outro' }, deps(usuario));
    expect(alterarFixa).toMatchObject({ ok: false, mensagem: MSG_PASTA_FIXA });

    const ciclo = await executarAcao(defMover, { ids: [primeira.dados.id], pastaId: filha.dados.id }, deps(usuario));
    expect(ciclo).toMatchObject({ ok: false, mensagem: MSG_CICLO });
  });

  it('não tira da Demanda o arquivo de uma Entrega e restaura o que foi para a lixeira', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const usuario = sessao(editorId, 'Editor');
    const demandaId = await criarDemanda({ editorId, titulo: 'Com entrega' });
    await sqlTeste()`
      INSERT INTO deliveries (id, demand_id, version, link, editor_id)
      VALUES ('EN0000000001', ${demandaId}, 1, 'https://exemplo.test/entrega', ${editorId})`;
    const ligado = await gravarArquivo(demandaId, editorId, 'entrega.jpg', 'EN0000000001');
    const solto = await gravarArquivo(demandaId, editorId, 'solto.jpg');
    const sub = await executarAcao(defCriarPasta, { pastaId: demandaId, nome: 'Seleção' }, deps(usuario));
    if (!sub.ok || !sub.dados) throw new Error('sub');

    const moverEntrega = await executarAcao(defMover, { ids: [ligado], pastaId: null }, deps(usuario));
    expect(moverEntrega).toMatchObject({ ok: false, mensagem: MSG_ENTREGA });
    const lixoEntrega = await executarAcao(defEnviarLixeira, { ids: [ligado] }, deps(usuario));
    expect(lixoEntrega).toMatchObject({ ok: false, mensagem: MSG_ENTREGA });

    const moverDentro = await executarAcao(defMover, { ids: [ligado], pastaId: sub.dados.id }, deps(usuario));
    expect(moverDentro.ok).toBe(true);
    expect((await abrirPasta(usuario, sub.dados.id))?.itens.map((item) => item.nome)).toEqual(['entrega.jpg']);

    const lixo = await executarAcao(defEnviarLixeira, { ids: [solto] }, deps(usuario));
    expect(lixo.ok).toBe(true);
    expect(await listarArquivosDemanda(demandaId)).toEqual([expect.objectContaining({ nome: 'entrega.jpg' })]);

    const [naLixeira] = await sqlTeste()<{ id: string }[]>`
      SELECT id FROM drive_nodes WHERE trash_root_id = id AND deleted_at IS NOT NULL`;
    const restaurado = await executarAcao(defRestaurar, { ids: [naLixeira!.id] }, deps(usuario));
    expect(restaurado.ok).toBe(true);
    expect((await listarArquivosDemanda(demandaId)).map((item) => item.nome).sort()).toEqual(['entrega.jpg', 'solto.jpg']);
  });

  it('expurga depois de 30 dias e recusa o que ainda está no prazo', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const antigo = 'DR00000000A1';
    const recente = 'DR00000000A2';
    await sqlTeste()`
      INSERT INTO drive_nodes (id, kind, name, created_by, deleted_at, trash_root_id)
      VALUES
        (${antigo}, 'pasta', 'Velha', ${editorId}, now() - interval '31 days', ${antigo}),
        (${recente}, 'pasta', 'Recente', ${editorId}, now() - interval '10 days', ${recente})`;

    const afetados = await expurgarVencidos(sqlTeste(), new Date());
    expect(afetados).toBe(1);
    const restantes = await sqlTeste()<{ id: string }[]>`SELECT id FROM drive_nodes ORDER BY id`;
    expect(restantes.map((item) => item.id)).toEqual([recente]);
    expect(await expurgarVencidos(sqlTeste(), new Date())).toBe(0);
  });

  it('grava o upload na Demanda e recusa quando a cota estoura', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda({ editorId, titulo: 'Com arquivo' });
    process.env.S3_BUCKET = BUCKET;
    process.env.AWS_REGION = REGIAO;
    const url = urlDoObjeto(
      BUCKET,
      REGIAO,
      montarChave('demandas', demandaId, 'foto.jpg', '11111111-1111-4111-8111-111111111111'),
    );
    const usuario = sessao(editorId, 'Editor');
    const gravado = await executarAcao(defConfirmarUploads, {
      pastaId: demandaId,
      arquivos: [{ url, nome: 'foto.jpg', tipo: 'image/jpeg', tamanho: 30 }],
    }, deps(usuario));
    expect(gravado.ok).toBe(true);
    expect(await listarArquivosDemanda(demandaId)).toEqual([expect.objectContaining({ nome: 'foto.jpg' })]);

    process.env.DRIVE_COTA_BYTES = '100';
    await sqlTeste()`
      INSERT INTO drive_nodes (id, kind, name, url, content_type, byte_size, created_by)
      VALUES ('DR00000000B1', 'arquivo', 'pesado.jpg', 'https://exemplo.test/pesado.jpg', 'image/jpeg', 80, ${editorId})`;
    const estouro = await executarAcao(defConfirmarUploads, {
      pastaId: null,
      arquivos: [{
        url: urlDoObjeto(BUCKET, REGIAO, montarChave('drive', 'raiz', 'novo.jpg', '22222222-2222-4222-8222-222222222222')),
        nome: 'novo.jpg',
        tipo: 'image/jpeg',
        tamanho: 30,
      }],
    }, deps(usuario));
    expect(estouro).toMatchObject({ ok: false, mensagem: MSG_COTA });
  });

  it('recusa o zip vazio ou acima do teto', () => {
    expect(avaliarVolumeZip([])).toBe(MSG_ZIP_VAZIO);
    expect(avaliarVolumeZip([{ tamanho: LIMITE_ZIP_BYTES + 1 }])).toBe(MSG_ZIP);
    expect(avaliarVolumeZip([{ tamanho: 10 }])).toBeNull();
  });
});
