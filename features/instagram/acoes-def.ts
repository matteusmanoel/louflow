import 'server-only';
import type { DefinicaoAcao } from '@/lib/action';
import { registrarAuditoria } from '@/lib/audit';
import { novoId } from '@/lib/crypto';
import type { Tx } from '@/lib/db';
import { ErroDominio } from '@/lib/errors';
import type { UsuarioSessao } from '@/lib/session';
import { demandaAberta, paiVisivel } from '@/features/drive/acesso';
import { comoBuffer, cifrarToken, decifrarToken, dicaToken } from './cripto';
import { ErroMeta, clienteMeta, mensagemPublica, type ContaDescoberta } from './meta';
import {
  mensagemMidia,
  midiaAceita,
  schemaAgendarPublicacao,
  schemaCriarPortfolio,
  schemaPortfolioId,
  schemaPublicacaoId,
  schemaSalvarToken,
  type FormatoMidia,
} from './schema';

const admin = (u: { permissoes: { conectarInstagram: boolean } }) => u.permissoes.conectarInstagram;

type PortfolioToken = {
  id: string;
  label: string;
  token_ciphertext: Buffer | Uint8Array | null;
  token_iv: Buffer | Uint8Array | null;
  token_version: number;
};

async function midiaDaEntregaAprovada(
  tx: Tx,
  usuario: UsuarioSessao,
  demandaId: string,
  arquivoId: string,
  formato: FormatoMidia,
) {
  const [demanda] = await tx<{ influencer_id: string | null; deleted_at: Date | null }[]>`
    SELECT influencer_id, deleted_at FROM demands WHERE id = ${demandaId} FOR UPDATE`;
  if (!demanda || demanda.deleted_at) throw new ErroDominio('Demanda não encontrada.');
  if (demanda.influencer_id !== usuario.id && !usuario.permissoes.conectarInstagram) {
    throw new ErroDominio('Você não pode agendar esta demanda.');
  }
  const [arquivo] = await tx<{ url: string; content_type: string }[]>`
    SELECT f.url, f.content_type
    FROM demand_files f
    JOIN deliveries d ON d.id = f.delivery_id
    WHERE f.id = ${arquivoId}
      AND f.demand_id = ${demandaId}
      AND f.deleted_at IS NULL
      AND d.status = 'Aprovada'`;
  if (!arquivo) throw new ErroDominio('Escolha um arquivo da entrega aprovada.');
  if (!midiaAceita(formato, arquivo.content_type)) throw new ErroDominio(mensagemMidia(formato));
  if (!arquivo.url.startsWith('https://')) throw new ErroDominio('O arquivo ainda não tem um endereço válido.');
  return { url: arquivo.url, influencerId: demanda.influencer_id ?? usuario.id };
}

async function urlDaMidia(tx: Tx, usuario: UsuarioSessao, arquivoId: string, formato: FormatoMidia): Promise<string> {
  const [no] = await tx<{
    kind: string;
    url: string | null;
    content_type: string | null;
    parent_id: string | null;
    deleted_at: Date | null;
  }[]>`
    SELECT kind, url, content_type, parent_id, deleted_at
    FROM drive_nodes WHERE id = ${arquivoId}`;
  if (no) {
    if (no.deleted_at || no.kind !== 'arquivo') throw new ErroDominio('Escolha um arquivo do Drive.');
    if (!(await paiVisivel(tx, usuario, no.parent_id))) throw new ErroDominio('Arquivo não encontrado.');
    if (!midiaAceita(formato, no.content_type)) throw new ErroDominio(mensagemMidia(formato));
    if (!no.url?.startsWith('https://')) throw new ErroDominio('O arquivo ainda não tem um endereço válido.');
    return no.url;
  }

  const [solto] = await tx<{
    url: string;
    content_type: string;
    deleted_at: Date | null;
    demand_id: string;
  }[]>`
    SELECT url, content_type, deleted_at, demand_id
    FROM demand_files WHERE id = ${arquivoId}`;
  if (!solto || solto.deleted_at || !(await demandaAberta(tx, usuario, solto.demand_id))) {
    throw new ErroDominio('Arquivo não encontrado.');
  }
  if (!midiaAceita(formato, solto.content_type)) throw new ErroDominio(mensagemMidia(formato));
  if (!solto.url.startsWith('https://')) throw new ErroDominio('O arquivo ainda não tem um endereço válido.');
  return solto.url;
}

function horarioBrasilia(valor: string): Date {
  const data = new Date(`${valor}:00-03:00`);
  if (Number.isNaN(data.getTime())) throw new ErroDominio('Data inválida.');
  if (data.getTime() < Date.now() - 60_000) throw new ErroDominio('Escolha um horário futuro.');
  return data;
}

async function gravarContas(
  tx: Parameters<DefinicaoAcao<typeof schemaPortfolioId, { situacao: string }>['executar']>[0]['tx'],
  portfolioId: string,
  contas: ContaDescoberta[],
) {
  for (const conta of contas) {
    const id = novoId('IA');
    await tx`
      INSERT INTO instagram_accounts (
        id, portfolio_id, ig_user_id, page_id, username, name, status, last_error, last_check_at
      ) VALUES (
        ${id}, ${portfolioId}, ${conta.igUserId}, ${conta.pageId}, ${conta.username}, ${conta.nome},
        ${conta.acessivel ? 'ok' : 'erro'}, ${conta.acessivel ? null : conta.erro}, now()
      )
      ON CONFLICT (portfolio_id, ig_user_id) DO UPDATE SET
        page_id = EXCLUDED.page_id,
        username = EXCLUDED.username,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        last_error = EXCLUDED.last_error,
        last_check_at = now(),
        updated_at = now()`;
  }

  const ids = contas.map((conta) => conta.igUserId);
  if (ids.length === 0) {
    await tx`
      UPDATE instagram_accounts
      SET status = 'ausente',
          last_error = 'A conta não voltou na última sincronização.',
          last_check_at = now(),
          updated_at = now()
      WHERE portfolio_id = ${portfolioId} AND status <> 'ausente'`;
    return;
  }

  await tx`
    UPDATE instagram_accounts
    SET status = 'ausente',
        last_error = 'A conta não voltou na última sincronização.',
        last_check_at = now(),
        updated_at = now()
    WHERE portfolio_id = ${portfolioId}
      AND ig_user_id <> ALL(${ids})`;
}

export const defCriarPortfolio: DefinicaoAcao<typeof schemaCriarPortfolio, { id: string }> = {
  nome: 'criarPortfolioInstagram',
  schema: schemaCriarPortfolio,
  permissao: admin,
  restricoes: { meta_portfolios_label_uq: 'Já existe um Business Manager com esse nome.' },
  executar: async ({ tx, usuario, entrada }) => {
    const id = novoId('MB');
    await tx`
      INSERT INTO meta_portfolios (id, label, created_by)
      VALUES (${id}, ${entrada.rotulo}, ${usuario.id})`;
    await registrarAuditoria(tx, {
      acao: 'criar_portfolio_instagram',
      usuarioId: usuario.id,
      alvo: id,
      detalhes: entrada.rotulo,
    });
    return { dados: { id }, mensagem: 'Business Manager cadastrado. Siga o guia e cole o token.' };
  },
};

export const defSalvarToken: DefinicaoAcao<typeof schemaSalvarToken, { id: string }> = {
  nome: 'salvarTokenInstagram',
  schema: schemaSalvarToken,
  permissao: admin,
  executar: async ({ tx, usuario, entrada }) => {
    const [atual] = await tx<{ id: string; label: string }[]>`
      SELECT id, label FROM meta_portfolios WHERE id = ${entrada.portfolioId} FOR UPDATE`;
    if (!atual) throw new ErroDominio('Business Manager não encontrado.');

    const cifrado = cifrarToken(entrada.token);
    await tx`
      UPDATE meta_portfolios SET
        token_ciphertext = ${cifrado.ciphertext},
        token_iv = ${cifrado.iv},
        token_hint = ${dicaToken(entrada.token)},
        token_version = token_version + 1,
        status = 'pendente',
        last_error = NULL,
        last_sync_at = NULL,
        updated_at = now()
      WHERE id = ${entrada.portfolioId}`;
    await tx`
      UPDATE instagram_accounts SET
        status = 'pendente',
        last_error = NULL,
        last_check_at = NULL,
        updated_at = now()
      WHERE portfolio_id = ${entrada.portfolioId}`;
    await registrarAuditoria(tx, {
      acao: 'salvar_token_instagram',
      usuarioId: usuario.id,
      alvo: entrada.portfolioId,
      detalhes: atual.label,
      depois: { credencialAtualizada: true },
    });
    return { dados: { id: entrada.portfolioId }, mensagem: 'Token salvo. Sincronize para confirmar as contas.' };
  },
};

export const defSincronizarPortfolio: DefinicaoAcao<
  typeof schemaPortfolioId,
  { situacao: 'autenticada' | 'erro' }
> = {
  nome: 'sincronizarPortfolioInstagram',
  schema: schemaPortfolioId,
  permissao: admin,
  executar: async ({ tx, usuario, entrada }) => {
    const [portfolio] = await tx<PortfolioToken[]>`
      SELECT id, label, token_ciphertext, token_iv, token_version
      FROM meta_portfolios
      WHERE id = ${entrada.portfolioId}
      FOR UPDATE`;
    if (!portfolio) throw new ErroDominio('Business Manager não encontrado.');
    if (!portfolio.token_ciphertext || !portfolio.token_iv) {
      throw new ErroDominio('Salve o token antes de sincronizar.');
    }

    let token: string;
    try {
      token = decifrarToken(comoBuffer(portfolio.token_ciphertext), comoBuffer(portfolio.token_iv));
    } catch (erro) {
      const mensagem = erro instanceof ErroDominio ? erro.message : 'Não foi possível ler o token salvo.';
      await tx`
        UPDATE meta_portfolios
        SET status = 'erro', last_error = ${mensagem}, updated_at = now()
        WHERE id = ${portfolio.id}`;
      return { dados: { situacao: 'erro' as const }, mensagem };
    }

    try {
      const resultado = await clienteMeta().sincronizar(token);
      await gravarContas(tx, portfolio.id, resultado.contas);
      const ok = resultado.contas.filter((conta) => conta.acessivel).length;
      const falhas = resultado.contas.length - ok;
      await tx`
        UPDATE meta_portfolios SET
          status = 'autenticada',
          meta_business_id = ${resultado.metaUserId},
          meta_user_name = ${resultado.metaUserName},
          last_error = NULL,
          last_sync_at = now(),
          updated_at = now()
        WHERE id = ${portfolio.id} AND token_version = ${portfolio.token_version}`;
      await registrarAuditoria(tx, {
        acao: 'sincronizar_portfolio_instagram',
        usuarioId: usuario.id,
        alvo: portfolio.id,
        detalhes: portfolio.label,
        depois: { contas: resultado.contas.length, ok },
      });
      const mensagem =
        resultado.contas.length === 0
          ? 'Token válido, mas nenhuma conta Instagram apareceu. Ligue o Instagram a uma Página, entregue essa Página ao usuário do sistema e gere outro token com ads_read e ads_management.'
          : falhas > 0
            ? `${ok} conta(s) com Ok e ${falhas} com erro.`
            : ok === 1
              ? '1 conta com Ok.'
              : `${ok} contas com Ok.`;
      return { dados: { situacao: 'autenticada' as const }, mensagem };
    } catch (erro) {
      const mensagem = mensagemPublica(
        erro instanceof ErroMeta ? erro.message : 'Não foi possível falar com a Meta.',
        token,
      );
      await tx`
        UPDATE meta_portfolios
        SET status = 'erro', last_error = ${mensagem}, updated_at = now()
        WHERE id = ${portfolio.id} AND token_version = ${portfolio.token_version}`;
      await registrarAuditoria(tx, {
        acao: 'sincronizar_portfolio_instagram',
        usuarioId: usuario.id,
        alvo: portfolio.id,
        detalhes: portfolio.label,
        depois: { falhou: true },
      });
      return { dados: { situacao: 'erro' as const }, mensagem };
    }
  },
};

const podeAgendar = (usuario: { permissoes: { conectarInstagram: boolean }; perfil: string }) =>
  usuario.permissoes.conectarInstagram || usuario.perfil === 'Influencer' || usuario.perfil === 'Administrador';

export const defAgendarPublicacao: DefinicaoAcao<typeof schemaAgendarPublicacao, { id: string }> = {
  nome: 'agendarPublicacaoInstagram',
  schema: schemaAgendarPublicacao,
  permissao: podeAgendar,
  executar: async ({ tx, usuario, entrada }) => {
    const [conta] = await tx<{ id: string; status: string; username: string }[]>`
      SELECT id, status, username FROM instagram_accounts WHERE id = ${entrada.contaId} FOR UPDATE`;
    if (!conta) throw new ErroDominio('Conta não encontrada.');
    if (conta.status !== 'ok') throw new ErroDominio('Só é possível agendar em uma conta com Ok.');

    let midiaUrl: string;
    let influencerId = usuario.id;
    if (entrada.demandaId) {
      const daEntrega = await midiaDaEntregaAprovada(tx, usuario, entrada.demandaId, entrada.arquivoId, entrada.formato);
      midiaUrl = daEntrega.url;
      influencerId = daEntrega.influencerId;
    } else if (!usuario.permissoes.conectarInstagram) {
      throw new ErroDominio('Você não tem permissão para esta ação.');
    } else {
      midiaUrl = await urlDaMidia(tx, usuario, entrada.arquivoId, entrada.formato);
    }

    const id = novoId('PS');
    const quando = horarioBrasilia(entrada.quando);
    await tx`
      INSERT INTO post_schedules (
        id, demand_id, influencer_id, title, platform, scheduled_at, status, brand, content_type,
        scheduled_by, instagram_account_id, caption, media_url, media_kind
      ) VALUES (
        ${id}, ${entrada.demandaId ?? null}, ${influencerId}, ${entrada.titulo}, 'Instagram', ${quando}, 'Agendada', ${entrada.marca},
        ${entrada.formato}, ${usuario.id}, ${conta.id}, ${entrada.legenda || null}, ${midiaUrl},
        ${entrada.formato}
      )`;
    if (entrada.demandaId) {
      await tx`
        UPDATE mandatory_schedules
        SET status = 'Agendada', resolved_at = now(), post_schedule_id = ${id}
        WHERE demand_id = ${entrada.demandaId} AND status = 'Pendente'`;
    }
    await registrarAuditoria(tx, {
      acao: 'agendar_publicacao_instagram',
      usuarioId: usuario.id,
      alvo: id,
      detalhes: `@${conta.username}`,
      depois: { titulo: entrada.titulo, formato: entrada.formato, marca: entrada.marca },
    });
    return { dados: { id }, mensagem: 'Publicação agendada. Ela sai no horário marcado.' };
  },
};

async function publicacaoAgendada(tx: Parameters<DefinicaoAcao<typeof schemaPublicacaoId, { id: string }>['executar']>[0]['tx'], id: string) {
  const [linha] = await tx<{ id: string; status: string }[]>`
    SELECT id, status FROM post_schedules
    WHERE id = ${id} AND instagram_account_id IS NOT NULL
    FOR UPDATE`;
  if (!linha) throw new ErroDominio('Agendamento não encontrado.');
  if (linha.status !== 'Agendada') throw new ErroDominio('Só é possível alterar uma publicação ainda agendada.');
  return linha;
}

export const defCancelarPublicacao: DefinicaoAcao<typeof schemaPublicacaoId, { id: string }> = {
  nome: 'cancelarPublicacaoInstagram',
  schema: schemaPublicacaoId,
  permissao: admin,
  executar: async ({ tx, usuario, entrada }) => {
    await publicacaoAgendada(tx, entrada.id);
    await tx`
      UPDATE post_schedules
      SET status = 'Cancelada', publish_claimed_at = NULL, updated_at = now()
      WHERE id = ${entrada.id}`;
    await registrarAuditoria(tx, {
      acao: 'cancelar_publicacao_instagram',
      usuarioId: usuario.id,
      alvo: entrada.id,
    });
    return { dados: { id: entrada.id }, mensagem: 'Agendamento cancelado.' };
  },
};

export const defReiniciarPublicacao: DefinicaoAcao<typeof schemaPublicacaoId, { id: string }> = {
  nome: 'reiniciarPublicacaoInstagram',
  schema: schemaPublicacaoId,
  permissao: admin,
  executar: async ({ tx, usuario, entrada }) => {
    await publicacaoAgendada(tx, entrada.id);
    await tx`
      UPDATE post_schedules SET
        publish_attempts = 0,
        publish_error = NULL,
        container_id = NULL,
        publish_claimed_at = NULL,
        updated_at = now()
      WHERE id = ${entrada.id}`;
    await registrarAuditoria(tx, {
      acao: 'reiniciar_publicacao_instagram',
      usuarioId: usuario.id,
      alvo: entrada.id,
    });
    return { dados: { id: entrada.id }, mensagem: 'A publicação volta a tentar no próximo ciclo.' };
  },
};
