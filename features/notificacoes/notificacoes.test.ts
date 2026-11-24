import { afterEach, describe, expect, it, vi } from 'vitest';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { executarAcao } from '@/lib/action';
import { despacharNotificacoes, registrarEnviador, type Notificacao } from '@/lib/notify';
import { resolverPermissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { defCriarDemanda } from '@/features/demandas/_acoes-def';
import { defAlterarStatus } from '@/features/status/acoes-def';
import { defAprovarEntrega, defReprovarEntrega } from '@/features/aprovacoes/_acoes-def';
import { lerCadencia } from './consultas';
import { enviarNotificacao } from './enviador';
import { avisarPendenciasInfluencer, enviarAlertasPrazo } from './jobs';
import { aplicarMencoes, marcadorMencao, textoResumoDiario } from './mensagens';
import { relogioSaoPaulo } from './relogio';
import { defEnviarEnsaio, defSalvarCadencia } from './acoes-def';

usarBancoLimpo();

const AMBIENTE = ['UAZAPI_BASE_URL', 'UAZAPI_TOKEN', 'UAZAPI_DESTINO', 'UAZAPI_GRUPO_LIBERADO', 'APP_URL'] as const;
const anterior = new Map<string, string | undefined>();

afterEach(() => {
  registrarEnviador(null);
  vi.restoreAllMocks();
  for (const chave of AMBIENTE) {
    const valor = anterior.get(chave);
    if (valor === undefined) delete process.env[chave];
    else process.env[chave] = valor;
  }
  anterior.clear();
});

function sessaoDe(id: string, perfil: UsuarioSessao['perfil'] = 'Administrador'): UsuarioSessao {
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

function ligarCanal(destino: string, grupo = false) {
  for (const chave of AMBIENTE) anterior.set(chave, process.env[chave]);
  process.env.UAZAPI_BASE_URL = 'https://exemplo.test';
  process.env.UAZAPI_TOKEN = 'token-teste';
  process.env.UAZAPI_DESTINO = destino;
  process.env.APP_URL = 'https://louflow.exemplo.test';
  if (grupo) process.env.UAZAPI_GRUPO_LIBERADO = 'true';
  else delete process.env.UAZAPI_GRUPO_LIBERADO;
}

function mockFetch() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
}

function corpo(chamada: ReturnType<typeof mockFetch>, indice = 0) {
  const init = chamada.mock.calls[indice]?.[1];
  return JSON.parse(String(init?.body)) as {
    number: string;
    text: string;
    choices: string[];
    mentions?: string;
    footerText: string;
  };
}

describe('menção', () => {
  it('usa o nome fora do grupo e o @ do telefone no grupo', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const texto = `Olá ${marcadorMencao(id)}`;
    const pessoa = { id, nome: 'Ada', whatsapp: '5511999990000' };
    expect(aplicarMencoes(texto, [pessoa], false)).toEqual({ texto: 'Olá Ada', mentions: [] });
    expect(aplicarMencoes(texto, [pessoa], true)).toEqual({
      texto: 'Olá @5511999990000',
      mentions: ['5511999990000'],
    });
    expect(aplicarMencoes(texto, [{ ...pessoa, whatsapp: null }], true).texto).toBe('Olá Ada');
  });
});

describe('relogio de São Paulo', () => {
  it('lê 08:00 quando o instante é 11:00 UTC em novembro', () => {
    expect(relogioSaoPaulo(new Date('2026-11-10T11:00:00Z'))).toEqual({ hora: 8, dia: '2026-11-10' });
  });
});

describe('enviador', () => {
  it('não chama a API sem credencial', async () => {
    const fetchMock = mockFetch();
    const { id } = await criarUsuario();
    await enviarNotificacao(sqlTeste(), {
      tipo: 'resumo_diario',
      destinatarios: [id],
      assunto: 'Teste',
      texto: 'Mensagem',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('não envia atribuição, ajuste nem aprovação', async () => {
    ligarCanal('5511999990000');
    const fetchMock = mockFetch();
    const { id } = await criarUsuario();
    for (const tipo of ['editor_atribuido', 'ajuste_solicitado', 'concluida_aprovada'] as const) {
      await enviarNotificacao(sqlTeste(), {
        tipo,
        destinatarios: [id],
        assunto: 'Imediato',
        texto: 'Mensagem',
      });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envia botão para o telefone e troca a menção pelo nome', async () => {
    ligarCanal('5511999990000');
    const fetchMock = mockFetch();
    const { id } = await criarUsuario({ nome: 'Ada' });
    await sqlTeste()`UPDATE users SET whatsapp = '5511999990000' WHERE id = ${id}`;

    await enviarNotificacao(sqlTeste(), {
      tipo: 'resumo_diario',
      destinatarios: [id],
      assunto: 'Resumo',
      texto: marcadorMencao(id),
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://exemplo.test/send/menu');
    const enviado = corpo(fetchMock);
    expect(enviado.number).toBe('5511999990000');
    expect(enviado.text).toBe('Ada');
    expect(enviado.mentions).toBeUndefined();
    expect(enviado.footerText).toBe('Loumar Turismo');
    expect(enviado.choices).toEqual(['Abrir demandas|https://louflow.exemplo.test/demandas']);
    const cabecalhos = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(cabecalhos.get('token')).toBe('token-teste');
  });

  it('recusa grupo sem liberação e registra o erro sem desfazer o fluxo', async () => {
    ligarCanal('120363000000000001@g.us');
    const fetchMock = mockFetch();
    await expect(
      enviarNotificacao(sqlTeste(), {
        tipo: 'resumo_diario',
        destinatarios: [],
        assunto: 'Resumo',
        texto: 'Texto',
      }),
    ).rejects.toThrow(/grupo/);
    expect(fetchMock).not.toHaveBeenCalled();

    await despacharNotificacoes(sqlTeste(), [
      { tipo: 'resumo_diario', destinatarios: [], assunto: 'Resumo', texto: 'Texto' },
    ]);
    const [erro] = await sqlTeste()<{ message: string }[]>`
      SELECT message FROM error_log WHERE origin = 'servidor:notificacao'`;
    expect(erro?.message).toMatch(/grupo/);

    await despacharNotificacoes(sqlTeste(), [
      { tipo: 'editor_atribuido', destinatarios: [], assunto: 'Atribuição', texto: 'Texto' },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('menciona no grupo quando a liberação está ligada', async () => {
    ligarCanal('120363000000000001@g.us', true);
    const fetchMock = mockFetch();
    const { id } = await criarUsuario({ nome: 'Ada' });
    await sqlTeste()`UPDATE users SET whatsapp = '5511999990000' WHERE id = ${id}`;
    await enviarNotificacao(sqlTeste(), {
      tipo: 'resumo_diario',
      destinatarios: [id],
      assunto: 'Resumo',
      texto: marcadorMencao(id),
    });
    const enviado = corpo(fetchMock);
    expect(enviado.text).toBe('@5511999990000');
    expect(enviado.mentions).toBe('5511999990000');
  });
});

describe('cadência', () => {
  it('devolve o padrão e grava a alteração só para quem gerencia usuários', async () => {
    const { id } = await criarUsuario({ perfil: 'Administrador' });
    expect(await lerCadencia(sqlTeste())).toMatchObject({ horaPrazo: 10, antecedenciaDias: 2, horaPendencia: 10, folgaHoras: 24 });

    const semPermissao = await executarAcao(
      defSalvarCadencia,
      { hora: 9 },
      { obterUsuario: async () => sessaoDe(id, 'Editor'), sql: sqlTeste },
    );
    expect(semPermissao.ok).toBe(false);

    const salvo = await executarAcao(
      defSalvarCadencia,
      { hora: 9 },
      { obterUsuario: async () => sessaoDe(id), sql: sqlTeste },
    );
    expect(salvo.ok).toBe(true);
    expect(await lerCadencia(sqlTeste())).toMatchObject({
      horaPrazo: 9,
      horaPendencia: 9,
      antecedenciaDias: 2,
      folgaHoras: 24,
    });
  });

  it('ensaio sem canal explica a falta de configuração e não chama a API', async () => {
    const fetchMock = mockFetch();
    const { id } = await criarUsuario({ perfil: 'Administrador' });
    const resultado = await executarAcao(defEnviarEnsaio, {}, {
      obterUsuario: async () => sessaoDe(id),
      sql: sqlTeste,
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.mensagem).toMatch(/não está configurado/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ensaio manda só o resumo diário para o destino de teste', async () => {
    ligarCanal('5511999990000');
    const fetchMock = mockFetch();
    const { id } = await criarUsuario({ perfil: 'Administrador' });
    const resultado = await executarAcao(defEnviarEnsaio, {}, {
      obterUsuario: async () => sessaoDe(id),
      sql: sqlTeste,
    });
    expect(resultado.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(corpo(fetchMock).choices[0]).toBe('Abrir demandas|https://louflow.exemplo.test/demandas');
    expect(corpo(fetchMock).text.startsWith('Pendências do dia\n\n')).toBe(true);
  });
});

describe('eventos na hora', () => {
  it('atribuição menciona o editor e não fala com você', async () => {
    const { id: autor } = await criarUsuario({ perfil: 'Administrador' });
    const { id: editor } = await criarUsuario({ perfil: 'Editor', nome: 'Ada' });
    const fila: Notificacao[] = [];
    registrarEnviador(async (_sql, aviso) => {
      fila.push(aviso);
    });
    const resultado = await executarAcao(
      defCriarDemanda,
      { title: 'Pacote', format: 'Pauta', editor_id: editor, priority: 'Normal' },
      { obterUsuario: async () => sessaoDe(autor), sql: sqlTeste },
    );
    expect(resultado.ok).toBe(true);
    expect(fila).toHaveLength(1);
    expect(fila[0]?.texto).toContain(marcadorMencao(editor));
    expect(fila[0]?.texto).not.toMatch(/você/i);
  });

  it('ajuste pelo status e pela reprovação, e aprovação da entrega, entram na fila', async () => {
    const { id: editor } = await criarUsuario({ perfil: 'Editor' });
    const { id: influencer } = await criarUsuario({ perfil: 'Influencer' });
    const { id: admin } = await criarUsuario({ perfil: 'Administrador' });
    const sql = sqlTeste();
    const demandaId = 'LF00AJUSTE01';
    await sql`
      INSERT INTO demands (id, title, format, editor_id, influencer_id, status)
      VALUES (${demandaId}, 'Pacote', 'Pauta', ${editor}, ${influencer}, 'Aprovação')`;
    await sql`
      INSERT INTO deliveries (id, demand_id, version, link, editor_id, status)
      VALUES ('ENT-1', ${demandaId}, 1, 'https://exemplo.test/v1', ${editor}, 'Aguardando aprovação')`;

    const fila: Notificacao[] = [];
    registrarEnviador(async (_sql, aviso) => {
      fila.push(aviso);
    });
    const deps = { obterUsuario: async () => sessaoDe(admin), sql: sqlTeste };

    const ajuste = await executarAcao(
      defAlterarStatus,
      { demandaId, novoStatus: 'Ajustes solicitados', motivo: 'Encurtar' },
      deps,
    );
    expect(ajuste.ok).toBe(true);
    expect(fila.at(-1)?.tipo).toBe('ajuste_solicitado');
    expect(fila.at(-1)?.texto).toContain('Encurtar');

    await sql`UPDATE demands SET status = 'Aprovação', completed_at = NULL WHERE id = ${demandaId}`;
    await sql`
      UPDATE deliveries
         SET status = 'Aguardando aprovação', reason = NULL
       WHERE id = 'ENT-1'`;
    const aprovacao = await executarAcao(defAprovarEntrega, { entregaId: 'ENT-1' }, deps);
    expect(aprovacao.ok).toBe(true);
    expect(fila.at(-1)?.tipo).toBe('concluida_aprovada');
    expect(fila.at(-1)?.destinatarios).toEqual([influencer]);
  });

  it('reprovação da entrega avisa o editor', async () => {
    const { id: editor } = await criarUsuario({ perfil: 'Editor' });
    const { id: influencer } = await criarUsuario({ perfil: 'Influencer' });
    const sql = sqlTeste();
    await sql`
      INSERT INTO demands (id, title, format, editor_id, influencer_id, status)
      VALUES ('LF00REPROV01', 'Pacote', 'Pauta', ${editor}, ${influencer}, 'Aprovação')`;
    await sql`
      INSERT INTO deliveries (id, demand_id, version, link, editor_id, status)
      VALUES ('ENT-2', 'LF00REPROV01', 1, 'https://exemplo.test/v1', ${editor}, 'Aguardando aprovação')`;
    const fila: Notificacao[] = [];
    registrarEnviador(async (_sql, aviso) => {
      fila.push(aviso);
    });
    const resultado = await executarAcao(
      defReprovarEntrega,
      { entregaId: 'ENT-2', motivoRejeicao: 'Refazer a abertura do vídeo' },
      { obterUsuario: async () => sessaoDe(influencer, 'Influencer'), sql: sqlTeste },
    );
    expect(resultado.ok).toBe(true);
    expect(fila[0]?.tipo).toBe('ajuste_solicitado');
    expect(fila[0]?.destinatarios).toEqual([editor]);
  });
});

describe('resumo diário', () => {
  const dez = new Date('2026-11-10T13:00:00Z');
  const onze = new Date('2026-11-10T14:00:00Z');

  it('limita cada seção a 20 linhas', () => {
    const atrasadas = Array.from({ length: 21 }, (_, indice) => ({
      titulo: `Atraso ${String(indice).padStart(2, '0')}`,
      prazo: '01/01/2026',
      editorId: null,
    }));
    const texto = textoResumoDiario({ atrasadas, aprovacao: [] });
    expect(texto).toContain('E mais 1.');
    expect(texto).toContain('Atraso 19');
    expect(texto).not.toContain('Atraso 20');
  });

  it('sai uma vez às 10h, com atrasada e aprovação, e não repete no mesmo dia', async () => {
    ligarCanal('5511999990000');
    const fetchMock = mockFetch();
    const { id: editor } = await criarUsuario({ nome: 'Ada' });
    const { id: influencer } = await criarUsuario({ nome: 'Lia' });
    await sqlTeste()`
      INSERT INTO demands (id, title, format, editor_id, status, post_date) VALUES
        ('LF00ATRAS001', 'Pacote atrasado', 'Pauta', ${editor}, 'Em execução', '2026-11-09'),
        ('LF00SEMED001', 'Sem dono', 'Pauta', NULL, 'Não iniciada', '2026-11-08'),
        ('LF00APROV001', 'Pacote em aprovação', 'Pauta', NULL, 'Aprovação', '2026-11-01'),
        ('LF00FUTUR001', 'Pacote futuro', 'Pauta', ${editor}, 'Em execução', '2026-11-12')`;
    await sqlTeste()`UPDATE demands SET influencer_id = ${influencer} WHERE id = 'LF00APROV001'`;
    await sqlTeste()`
      INSERT INTO mandatory_schedules (id, demand_id, influencer_id, title, version, status)
      VALUES ('AG-1', 'LF00APROV001', ${influencer}, 'Agenda obrigatória', 1, 'Pendente')`;

    const fora = await avisarPendenciasInfluencer({ sql: sqlTeste(), agora: onze });
    const primeiro = await avisarPendenciasInfluencer({ sql: sqlTeste(), agora: dez });
    const repetido = await enviarAlertasPrazo({ sql: sqlTeste(), agora: dez });

    expect(fora.afetados).toBe(0);
    expect(primeiro.afetados).toBe(3);
    expect(repetido.afetados).toBe(0);
    expect(fetchMock).toHaveBeenCalledOnce();
    const texto = corpo(fetchMock).text;
    expect(texto).toContain('Atrasadas');
    expect(texto).toContain('Aguardando aprovação');
    expect(texto).toContain('Ada');
    expect(texto).toContain('Sem editor');
    expect(texto).toContain('Lia');
    expect(texto).not.toContain('Pacote futuro');
    expect(texto).not.toContain('Agenda obrigatória');
    expect(corpo(fetchMock).choices[0]).toContain('/demandas');
  });
});
