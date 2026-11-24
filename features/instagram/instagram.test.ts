import { afterEach, describe, expect, it } from 'vitest';
import { executarAcao, MENSAGEM_SEM_PERMISSAO } from '@/lib/action';
import { resolverPermissoes, type Perfil } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import {
  defAgendarPublicacao,
  defCriarPortfolio,
  defSalvarToken,
  defSincronizarPortfolio,
} from './acoes-def';
import { publicarPostagensInstagram } from './jobs';
import { ErroMeta, definirClienteMeta, mensagemPublica, type ClienteMeta } from './meta';

usarBancoLimpo();

const TOKEN = 'EAA-token-sintetico-de-teste-0001';

afterEach(() => {
  definirClienteMeta(null);
});

function sessao(id: string, perfil: Perfil): UsuarioSessao {
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

function deps(usuario: UsuarioSessao) {
  return { obterUsuario: async () => usuario, sql: sqlTeste };
}

function clienteOk(): ClienteMeta {
  return {
    async sincronizar() {
      return {
        metaUserId: 'su-1',
        metaUserName: 'Sistema teste',
        contas: [
          {
            igUserId: 'ig-1',
            pageId: 'pg-1',
            username: 'marca.test',
            nome: 'Marca teste',
            acessivel: true,
            erro: null,
          },
        ],
      };
    },
    async criarContainer() {
      return { containerId: 'container-1' };
    },
    async publicarContainer() {
      return { igMediaId: 'midia-1' };
    },
  };
}

async function prepararContaOk(admin: UsuarioSessao) {
  definirClienteMeta(clienteOk());
  const criado = await executarAcao(defCriarPortfolio, { rotulo: 'BM teste' }, deps(admin));
  expect(criado.ok).toBe(true);
  if (!criado.ok) return null;
  const salvo = await executarAcao(defSalvarToken, { portfolioId: criado.dados.id, token: TOKEN }, deps(admin));
  expect(salvo.ok).toBe(true);
  const sync = await executarAcao(defSincronizarPortfolio, { portfolioId: criado.dados.id }, deps(admin));
  expect(sync.ok).toBe(true);
  if (!sync.ok) return null;
  expect(sync.dados.situacao).toBe('autenticada');
  const [conta] = await sqlTeste()<{ id: string; status: string }[]>`
    SELECT id, status FROM instagram_accounts WHERE username = 'marca.test'`;
  return conta ?? null;
}

describe('mensagemPublica', () => {
  it('remove o token da mensagem', () => {
    expect(mensagemPublica(`falha ${TOKEN} no access_token=${TOKEN}`, TOKEN)).not.toContain(TOKEN);
  });
});

describe('integração Instagram', () => {
  it('recusa quem não conecta Instagram', async () => {
    const editor = await criarUsuario({ perfil: 'Editor' });
    const r = await executarAcao(defCriarPortfolio, { rotulo: 'Outro BM' }, deps(sessao(editor.id, 'Editor')));
    expect(r).toMatchObject({ ok: false, mensagem: MENSAGEM_SEM_PERMISSAO });
  });

  it('guarda o token cifrado e a auditoria sem o valor', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const usuario = sessao(admin.id, 'Administrador');
    const criado = await executarAcao(defCriarPortfolio, { rotulo: 'BM cifra' }, deps(usuario));
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;

    const salvo = await executarAcao(defSalvarToken, { portfolioId: criado.dados.id, token: TOKEN }, deps(usuario));
    expect(salvo.ok).toBe(true);

    const [linha] = await sqlTeste()<{ token_ciphertext: Buffer; token_hint: string; status: string }[]>`
      SELECT token_ciphertext, token_hint, status FROM meta_portfolios WHERE id = ${criado.dados.id}`;
    expect(linha?.status).toBe('pendente');
    expect(linha?.token_hint).toBe('0001');
    expect(Buffer.from(linha!.token_ciphertext).toString('utf8')).not.toContain(TOKEN);

    const [auditoria] = await sqlTeste()<{ after: string | null }[]>`
      SELECT after::text FROM audit_log WHERE action = 'salvar_token_instagram'`;
    expect(auditoria?.after ?? '').not.toContain(TOKEN);
  });

  it('sincroniza a conta com Ok e não grava o token no erro', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const usuario = sessao(admin.id, 'Administrador');
    const conta = await prepararContaOk(usuario);
    expect(conta?.status).toBe('ok');

    const [portfolio] = await sqlTeste()<{ id: string }[]>`SELECT id FROM meta_portfolios WHERE label = 'BM teste'`;
    definirClienteMeta({
      ...clienteOk(),
      async sincronizar() {
        throw new ErroMeta(`recusado ${TOKEN}`);
      },
    });
    const falha = await executarAcao(defSincronizarPortfolio, { portfolioId: portfolio!.id }, deps(usuario));
    expect(falha.ok).toBe(true);
    if (!falha.ok) return;
    expect(falha.dados.situacao).toBe('erro');
    expect(falha.mensagem).not.toContain(TOKEN);
    const [erro] = await sqlTeste()<{ last_error: string }[]>`
      SELECT last_error FROM meta_portfolios WHERE id = ${portfolio!.id}`;
    expect(erro?.last_error ?? '').not.toContain(TOKEN);
  });

  it('agenda só em conta Ok e publica uma vez, reusando o container', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const usuario = sessao(admin.id, 'Administrador');
    const conta = await prepararContaOk(usuario);
    expect(conta).not.toBeNull();

    const futuro = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(futuro);
    const pegar = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value;
    const quando = `${pegar('year')}-${pegar('month')}-${pegar('day')}T${pegar('hour')}:${pegar('minute')}`;

    await sqlTeste()`
      INSERT INTO drive_nodes (id, kind, name, url, content_type, byte_size, created_by)
      VALUES
        ('arqinst01', 'arquivo', 'foto.jpg', 'https://exemplo.test/foto.jpg', 'image/jpeg', 1200, ${admin.id}),
        ('arqpng01', 'arquivo', 'foto.png', 'https://exemplo.test/foto.png', 'image/png', 1200, ${admin.id})`;

    const pedido = {
      contaId: conta!.id,
      titulo: 'Post de teste',
      legenda: 'Legenda sintética',
      formato: 'imagem' as const,
      marca: 'Loumar' as const,
      quando,
    };
    const recusado = await executarAcao(defAgendarPublicacao, { ...pedido, arquivoId: 'arqpng01' }, deps(usuario));
    expect(recusado.ok).toBe(false);
    if (!recusado.ok) expect(recusado.mensagem).toMatch(/JPEG/);

    const agendado = await executarAcao(
      defAgendarPublicacao,
      { ...pedido, arquivoId: 'arqinst01' },
      deps(usuario),
    );
    expect(agendado.ok).toBe(true);
    if (!agendado.ok) return;

    const [gravado] = await sqlTeste()<{ media_url: string }[]>`
      SELECT media_url FROM post_schedules WHERE id = ${agendado.dados.id}`;
    expect(gravado?.media_url).toBe('https://exemplo.test/foto.jpg');

    await sqlTeste()`
      UPDATE post_schedules SET scheduled_at = now() - interval '1 minute' WHERE id = ${agendado.dados.id}`;

    const chamadas: string[] = [];
    definirClienteMeta({
      ...clienteOk(),
      async criarContainer() {
        chamadas.push('container');
        return { containerId: 'container-1' };
      },
      async publicarContainer(_token, _ig, containerId) {
        chamadas.push(`publish:${containerId}`);
        if (chamadas.filter((c) => c.startsWith('publish')).length === 1) {
          throw new ErroMeta('O vídeo ainda está processando.', { tentarDeNovo: true, containerId });
        }
        return { igMediaId: 'midia-1' };
      },
    });

    const primeira = await publicarPostagensInstagram({ sql: sqlTeste(), agora: new Date() });
    expect(primeira.afetados).toBe(0);
    const [meio] = await sqlTeste()<{ container_id: string; status: string; publish_attempts: number }[]>`
      SELECT container_id, status, publish_attempts FROM post_schedules WHERE id = ${agendado.dados.id}`;
    expect(meio).toMatchObject({ container_id: 'container-1', status: 'Agendada', publish_attempts: 0 });

    const segunda = await publicarPostagensInstagram({ sql: sqlTeste(), agora: new Date() });
    expect(segunda.afetados).toBe(1);
    expect(chamadas.filter((c) => c === 'container')).toHaveLength(1);

    const terceira = await publicarPostagensInstagram({ sql: sqlTeste(), agora: new Date() });
    expect(terceira.afetados).toBe(0);
    const [fim] = await sqlTeste()<{ status: string; ig_media_id: string }[]>`
      SELECT status, ig_media_id FROM post_schedules WHERE id = ${agendado.dados.id}`;
    expect(fim).toMatchObject({ status: 'Publicada', ig_media_id: 'midia-1' });
  });
});
