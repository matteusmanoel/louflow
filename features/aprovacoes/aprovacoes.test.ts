import { describe, expect, it } from 'vitest';
import { executarAcao } from '@/lib/action';
import type { Permissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { defRegistrarEntrega, defAprovarEntrega, defReprovarEntrega } from './actions';
import { listarAprovacoes, listarEntregasDemanda } from './consultas';

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

  it('falha sem permissão editarDemandas', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda('Em execução', editorId);
    const semPerm = sessao(editorId); // sem editarDemandas

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
  it('reprova entrega e devolve Demanda para Em execução', async () => {
    const { id: editorId } = await criarUsuario({ perfil: 'Editor' });
    const { id: aprovadorId } = await criarUsuario({ perfil: 'Administrador' });
    const demandaId = await criarDemanda('Em execução', editorId);

    const editor = sessao(editorId, { editarDemandas: true });
    const aprovador = sessao(aprovadorId, { verTodasDemandas: true });

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
    expect(dem?.status).toBe('Em execução');

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
