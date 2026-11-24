import { describe, expect, it } from 'vitest';
import { executarAcao } from '@/lib/action';
import type { Permissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { defAgendarPublicacao } from '@/features/instagram/acoes-def';
import { defRegistrarEntrega, defAprovarEntrega, defReprovarEntrega } from './_acoes-def';
import { listarAprovacoes, listarEntregasDemanda } from './consultas';
import { montarChave, urlDoObjeto } from '@/lib/armazenamento-chave';

usarBancoLimpo();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PERMISSOES_VAZIAS: Permissoes = {
  criarDemandas: false,
  definirOutroEditor: false,
  verTodasDemandas: false,
  editarDemandas: false,
  atribuirEditor: false,
  alterarStatus: false,
  alterarPrioridade: false,
  excluirDemandas: false,
  enviarFicha: false,
  verAgenda: false,
  gerenciarAgenda: false,
  verCaptacoes: false,
  gerenciarCaptacoes: false,
  acessarCortes: false,
  verAbaCortes: false,
  verRelatorios: false,
  usarAnalista: false,
  gerenciarUsuarios: false,
  verLixeira: false,
  verSorteios: false,
  operarDrone: false,
  editorPadraoCortes: false,
  notaInformativaRanking: false,
  conectarInstagram: false,
};

function sessao(id: string, perm: Partial<Permissoes> = {}): UsuarioSessao {
  return {
    id,
    nome: 'Teste',
    perfil: 'Editor',
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: { ...PERMISSOES_VAZIAS, ...perm },
    ehAprovadorDelegado: false,
  };
}

function deps(usuario: UsuarioSessao) {
  return { obterUsuario: async () => usuario, sql: () => sqlTeste() };
}

let demandaCounter = 0;
async function criarDemanda(
  status = 'Em execução',
  editorId?: string,
): Promise<string> {
  demandaCounter += 1;
  const id = `LF${String(demandaCounter + 100).padStart(10, '0')}`;
  const sql = sqlTeste();
  await sql`
    INSERT INTO demands (id, title, format, status, priority)
    VALUES (${id}, ${'Demanda Aprovacoes'}, ${'Vídeo'}, ${status}, ${'Normal'})`;
  if (editorId) {
    await sql`UPDATE demands SET editor_id = ${editorId} WHERE id = ${id}`;
  }
  return id;
}

// ---------------------------------------------------------------------------
// registrarEntrega
// ---------------------------------------------------------------------------

describe('registrarEntrega', () => {
  it('registra entrega, cria delivery e muda status para Aprovação', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda('Em execução', editorId);
    const editor = sessao(editorId, { editarDemandas: true });

    const res = await executarAcao(
      defRegistrarEntrega,
      { demandaId, arquivoUrl: 'https://drive.example.com/file/1' },
      deps(editor),
    );

    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error('esperado ok');
    expect(res.dados.entregaId).toContain(demandaId);

    const sql = sqlTeste();
    const [dem] = await sql<{ status: string }[]>`SELECT status FROM demands WHERE id = ${demandaId}`;
    expect(dem?.status).toBe('Aprovação');

    const [del] = await sql<{ status: string }[]>`SELECT status FROM deliveries WHERE demand_id = ${demandaId}`;
    expect(del?.status).toBe('Aguardando aprovação');
  });

  it('grava vários arquivos na pasta da Demanda e recusa arquivo de outra', async () => {
    process.env.S3_BUCKET = 'louflow-app-private-796576080439';
    process.env.AWS_REGION = 'us-east-1';
    try {
      const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
      const demandaId = await criarDemanda('Em execução', editorId);
      const editor = sessao(editorId, { editarDemandas: true });
      const item = (nome: string, idArquivo: string, dono = demandaId) => {
        const chave = montarChave('demandas', dono, nome, idArquivo);
        return {
          url: urlDoObjeto('louflow-app-private-796576080439', 'us-east-1', chave),
          nome,
          tipo: 'video/mp4' as const,
          tamanho: 1024,
        };
      };
      const arquivos = [
        item('dois.mp4', '22222222-2222-4222-8222-222222222222'),
        item('um.mp4', '11111111-1111-4111-8111-111111111111'),
      ];

      const res = await executarAcao(
        defRegistrarEntrega,
        { demandaId, arquivoUrl: arquivos[0]!.url, arquivos },
        deps(editor),
      );
      expect(res.ok).toBe(true);

      const linhas = await sqlTeste()<{ file_name: string }[]>`
        SELECT file_name FROM demand_files WHERE demand_id = ${demandaId} ORDER BY file_name`;
      expect(linhas.map((linha) => linha.file_name)).toEqual(['dois.mp4', 'um.mp4']);
    } finally {
      delete process.env.S3_BUCKET;
      delete process.env.AWS_REGION;
    }
  });

  it('recusa arquivo de outra Demanda', async () => {
    process.env.S3_BUCKET = 'louflow-app-private-796576080439';
    process.env.AWS_REGION = 'us-east-1';
    try {
      const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
      const demandaId = await criarDemanda('Em execução', editorId);
      const editor = sessao(editorId, { editarDemandas: true });
      const chave = montarChave('demandas', 'LF0000000999', 'outro.mp4', '33333333-3333-4333-8333-333333333333');
      const alheio = await executarAcao(
        defRegistrarEntrega,
        {
          demandaId,
          arquivoUrl: 'https://drive.example.com/file/alheio',
          arquivos: [{
            url: urlDoObjeto('louflow-app-private-796576080439', 'us-east-1', chave),
            nome: 'outro.mp4',
            tipo: 'video/mp4' as const,
            tamanho: 1024,
          }],
        },
        deps(editor),
      );
      expect(alheio).toMatchObject({ ok: false, mensagem: 'O arquivo não pertence a esta Demanda.' });
    } finally {
      delete process.env.S3_BUCKET;
      delete process.env.AWS_REGION;
    }
  });

  it('falha se status não é Em execução', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda('Não iniciada', editorId);
    const editor = sessao(editorId, { editarDemandas: true });

    const res = await executarAcao(
      defRegistrarEntrega,
      { demandaId, arquivoUrl: 'https://drive.example.com/file/2' },
      deps(editor),
    );

    expect(res.ok).toBe(false);
    expect(res.mensagem).toMatch(/Em execução/);
  });

  it('falha sem permissão editarDemandas quando a Demanda é de outro Editor', async () => {
    const { id: donoId } = await criarUsuario({ perfil: 'Editor' });
    const { id: outroId } = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda('Em execução', donoId);
    const semPerm = sessao(outroId); // sem editarDemandas e sem ser o Editor da Demanda

    const res = await executarAcao(
      defRegistrarEntrega,
      { demandaId, arquivoUrl: 'https://drive.example.com/file/3' },
      deps(semPerm),
    );

    expect(res.ok).toBe(false);
    expect(res.mensagem).toMatch(/permissão/i);
  });
});

// ---------------------------------------------------------------------------
// aprovarEntrega
// ---------------------------------------------------------------------------

describe('aprovarEntrega', () => {
  it('aprova entrega e muda status da Demanda para Concluída', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const { id: aprovadorId } = await criarUsuario({ perfil: 'Administrador' });
    const demandaId = await criarDemanda('Em execução', editorId);

    const editor = sessao(editorId, { editarDemandas: true });
    const aprovador = sessao(aprovadorId, { verTodasDemandas: true });

    // Registra entrega primeiro
    const regRes = await executarAcao(
      defRegistrarEntrega,
      { demandaId, arquivoUrl: 'https://drive.example.com/file/4' },
      deps(editor),
    );
    if (!regRes.ok) throw new Error(regRes.mensagem);
    const entregaId = regRes.dados.entregaId;

    // Aprova
    const apRes = await executarAcao(
      defAprovarEntrega,
      { entregaId, observacoes: 'Ótimo trabalho!' },
      deps(aprovador),
    );

    expect(apRes.ok).toBe(true);

    const sql = sqlTeste();
    const [dem] = await sql<{ status: string }[]>`SELECT status FROM demands WHERE id = ${demandaId}`;
    expect(dem?.status).toBe('Concluída');

    const [del] = await sql<{ status: string; evaluated_by: string }[]>`
      SELECT status, evaluated_by FROM deliveries WHERE id = ${entregaId}`;
    expect(del?.status).toBe('Aprovada');
    expect(del?.evaluated_by).toBe(aprovadorId);
  });

  it('falha sem permissão verTodasDemandas', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda('Em execução', editorId);
    const editor = sessao(editorId, { editarDemandas: true });

    const regRes = await executarAcao(
      defRegistrarEntrega,
      { demandaId, arquivoUrl: 'https://drive.example.com/file/5' },
      deps(editor),
    );
    if (!regRes.ok) throw new Error(regRes.mensagem);
    const entregaId = regRes.dados.entregaId;

    const semPerm = sessao(editorId); // sem verTodasDemandas
    const apRes = await executarAcao(defAprovarEntrega, { entregaId }, deps(semPerm));

    expect(apRes.ok).toBe(false);
    expect(apRes.mensagem).toMatch(/permissão/i);
  });
});

// ---------------------------------------------------------------------------
// reprovarEntrega
// ---------------------------------------------------------------------------

describe('reprovarEntrega', () => {
  it('influencer pede ajuste e a demanda fica em Ajustes solicitados', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const { id: influencerId } = await criarUsuario({ perfil: 'Influencer' });
    const demandaId = await criarDemanda('Em execução', editorId);
    await sqlTeste()`UPDATE demands SET influencer_id = ${influencerId} WHERE id = ${demandaId}`;

    const editor = sessao(editorId, { editarDemandas: true });
    const aprovador: UsuarioSessao = {
      ...sessao(influencerId),
      perfil: 'Influencer',
      nome: 'Influencer',
    };

    const regRes = await executarAcao(
      defRegistrarEntrega,
      { demandaId, arquivoUrl: 'https://drive.example.com/file/6' },
      deps(editor),
    );
    if (!regRes.ok) throw new Error(regRes.mensagem);
    const entregaId = regRes.dados.entregaId;

    const repRes = await executarAcao(
      defReprovarEntrega,
      { entregaId, motivoRejeicao: 'Qualidade insuficiente.' },
      deps(aprovador),
    );

    expect(repRes.ok).toBe(true);

    const sql = sqlTeste();
    const [dem] = await sql<{ status: string }[]>`SELECT status FROM demands WHERE id = ${demandaId}`;
    expect(dem?.status).toBe('Ajustes solicitados');

    const [del] = await sql<{ status: string; reason: string | null }[]>`
      SELECT status, reason FROM deliveries WHERE id = ${entregaId}`;
    expect(del?.status).toBe('Ajustes solicitados');
    expect(del?.reason).toBe('Qualidade insuficiente.');
  });

  it('falha se entrega não está aguardando aprovação', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const { id: aprovadorId } = await criarUsuario({ perfil: 'Administrador' });
    const demandaId = await criarDemanda('Em execução', editorId);

    const editor = sessao(editorId, { editarDemandas: true });
    const aprovador = sessao(aprovadorId, { verTodasDemandas: true });

    const regRes = await executarAcao(
      defRegistrarEntrega,
      { demandaId, arquivoUrl: 'https://drive.example.com/file/7' },
      deps(editor),
    );
    if (!regRes.ok) throw new Error(regRes.mensagem);
    const entregaId = regRes.dados.entregaId;

    // Aprova primeiro
    await executarAcao(defAprovarEntrega, { entregaId }, deps(aprovador));

    // Tenta reprovar depois de já aprovada
    const repRes = await executarAcao(
      defReprovarEntrega,
      { entregaId, motivoRejeicao: 'Tarde demais.' },
      deps(aprovador),
    );

    expect(repRes.ok).toBe(false);
    expect(repRes.mensagem).toMatch(/aguardando aprovação/i);
  });
});

// ---------------------------------------------------------------------------
// listarAprovacoes — consulta
// ---------------------------------------------------------------------------

describe('listarAprovacoes', () => {
  it('retorna entregas pendentes para administrador', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const demandaId = await criarDemanda('Em execução', editorId);

    const editor = sessao(editorId, { editarDemandas: true });
    await executarAcao(
      defRegistrarEntrega,
      { demandaId, arquivoUrl: 'https://drive.example.com/file/8' },
      deps(editor),
    );

    const admin = sessao(adminId, { verTodasDemandas: true });
    // Precisamos de um UsuarioSessao real para consultas
    const realAdmin: UsuarioSessao = { ...admin, perfil: 'Administrador' };
    const lista = await listarAprovacoes(realAdmin);

    expect(lista.length).toBeGreaterThanOrEqual(1);
    expect(lista.some((a) => a.demandaId === demandaId)).toBe(true);
  });

  it('listarEntregasDemanda retorna histórico de entregas', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda('Em execução', editorId);

    const editor = sessao(editorId, { editarDemandas: true });
    await executarAcao(
      defRegistrarEntrega,
      { demandaId, arquivoUrl: 'https://drive.example.com/file/9' },
      deps(editor),
    );

    const hist = await listarEntregasDemanda(demandaId);
    expect(hist).toHaveLength(1);
    expect(hist[0]!.versao).toBe(1);
    expect(hist[0]!.status).toBe('Aguardando aprovação');
  });
});

describe('aprovação seguida de agendamento', () => {
  it('cria a agenda obrigatória e o influencer agenda o arquivo da entrega', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const { id: influencerId } = await criarUsuario({ perfil: 'Influencer' });
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const demandaId = await criarDemanda('Em execução', editorId);
    const sql = sqlTeste();
    await sql`UPDATE demands SET influencer_id = ${influencerId} WHERE id = ${demandaId}`;
    await sql`
      INSERT INTO meta_portfolios (id, label, status, created_by)
      VALUES ('MPtesteag01', 'BM de teste', 'sem_token', ${adminId})`;
    await sql`
      INSERT INTO instagram_accounts (id, portfolio_id, ig_user_id, page_id, username, status)
      VALUES ('IAtesteag01', 'MPtesteag01', '17840000000000001', '100000000000001', 'conta.teste', 'ok')`;

    const editor = sessao(editorId, { editarDemandas: true });
    const influencer: UsuarioSessao = { ...sessao(influencerId), perfil: 'Influencer', nome: 'Influencer' };
    const registrada = await executarAcao(
      defRegistrarEntrega,
      { demandaId, arquivoUrl: 'https://exemplo.test/entrega.jpg' },
      deps(editor),
    );
    if (!registrada.ok) throw new Error(registrada.mensagem);

    await sql`
      INSERT INTO demand_files (id, demand_id, delivery_id, url, file_name, content_type, byte_size, created_by)
      VALUES (
        'ARteste0001', ${demandaId}, ${registrada.dados.entregaId},
        'https://exemplo.test/entrega.jpg', 'entrega.jpg', 'image/jpeg', 1200, ${editorId}
      )`;

    const aprovada = await executarAcao(defAprovarEntrega, { entregaId: registrada.dados.entregaId }, deps(influencer));
    expect(aprovada.ok).toBe(true);
    const [obrigatoria] = await sql<{ status: string }[]>`
      SELECT status FROM mandatory_schedules WHERE demand_id = ${demandaId}`;
    expect(obrigatoria?.status).toBe('Pendente');

    const agendada = await executarAcao(
      defAgendarPublicacao,
      {
        contaId: 'IAtesteag01',
        titulo: 'Post da entrega',
        legenda: 'Legenda da entrega',
        arquivoId: 'ARteste0001',
        demandaId,
        formato: 'imagem',
        marca: 'Loumar',
        quando: '2026-12-01T15:00',
      },
      deps(influencer),
    );
    expect(agendada.ok).toBe(true);

    const [agenda] = await sql<{ demand_id: string; status: string }[]>`
      SELECT demand_id, status FROM post_schedules WHERE demand_id = ${demandaId}`;
    expect(agenda?.status).toBe('Agendada');
    const [resolvida] = await sql<{ status: string; post_schedule_id: string | null }[]>`
      SELECT status, post_schedule_id FROM mandatory_schedules WHERE demand_id = ${demandaId}`;
    expect(resolvida?.status).toBe('Agendada');
    expect(resolvida?.post_schedule_id).toBeTruthy();
  });

  it('administrador aprova e não solicita ajuste', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
    const demandaId = await criarDemanda('Em execução', editorId);
    const editor = sessao(editorId, { editarDemandas: true });
    const admin: UsuarioSessao = { ...sessao(adminId, { verTodasDemandas: true }), perfil: 'Administrador' };
    const registrada = await executarAcao(
      defRegistrarEntrega,
      { demandaId, arquivoUrl: 'https://exemplo.test/ajuste.jpg' },
      deps(editor),
    );
    if (!registrada.ok) throw new Error(registrada.mensagem);
    const resposta = await executarAcao(
      defReprovarEntrega,
      { entregaId: registrada.dados.entregaId, motivoRejeicao: 'Trocar a foto.' },
      deps(admin),
    );
    expect(resposta.ok).toBe(false);
    expect(resposta.mensagem).toMatch(/influencer/i);
  });
});
