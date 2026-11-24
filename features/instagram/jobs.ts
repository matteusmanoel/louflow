import { linkAcessivel } from '@/lib/armazenamento';
import type { HandlerJob } from '@/lib/cron';
import type { Sql } from '@/lib/db';
import { ErroDominio } from '@/lib/errors';
import { comoBuffer, decifrarToken } from './cripto';
import { ErroMeta, clienteMeta, mensagemPublica, type FormatoPublicacao } from './meta';

const LIMITE_FATAL = 5;
const JANELA_CONTAINER_MS = 23 * 60 * 60 * 1000;

type Linha = {
  id: string;
  ig_user_id: string;
  media_kind: FormatoPublicacao;
  caption: string | null;
  media_url: string;
  container_id: string | null;
  scheduled_at: Date;
  publish_attempts: number;
  token_ciphertext: Buffer | Uint8Array;
  token_iv: Buffer | Uint8Array;
  conta_status: string;
};

async function reivindicar(sql: Sql, id: string, agora: Date): Promise<Linha | null> {
  const [linha] = await sql<Linha[]>`
    UPDATE post_schedules ps SET
      publish_claimed_at = ${agora},
      updated_at = now()
    FROM instagram_accounts ia
    JOIN meta_portfolios mp ON mp.id = ia.portfolio_id
    WHERE ps.id = ${id}
      AND ps.instagram_account_id = ia.id
      AND ps.status = 'Agendada'
      AND ps.ig_media_id IS NULL
      AND ps.publish_attempts < ${LIMITE_FATAL}
      AND ps.media_url IS NOT NULL
      AND mp.token_ciphertext IS NOT NULL
      AND (ps.publish_claimed_at IS NULL OR ps.publish_claimed_at < ${agora}::timestamptz - interval '2 minutes')
    RETURNING ps.id, ia.ig_user_id, ps.media_kind, ps.caption, ps.media_url, ps.container_id,
              ps.scheduled_at, ps.publish_attempts, mp.token_ciphertext, mp.token_iv, ia.status AS conta_status`;
  return linha ?? null;
}

async function falha(sql: Sql, linha: Linha, erro: ErroMeta, agora: Date) {
  const expirouNaFila = agora.getTime() - linha.scheduled_at.getTime() > JANELA_CONTAINER_MS;
  const tentarDeNovo = erro.tentarDeNovo && !expirouNaFila;
  const container = erro.limparContainer ? null : (erro.containerId ?? linha.container_id);
  const mensagem = expirouNaFila
    ? 'O material expirou na Meta antes da publicação. Cancele e agende de novo.'
    : mensagemPublica(erro.message);
  await sql`
    UPDATE post_schedules SET
      container_id = ${container},
      publish_error = ${mensagem},
      publish_attempts = publish_attempts + ${tentarDeNovo ? 0 : 1},
      publish_claimed_at = NULL,
      updated_at = now()
    WHERE id = ${linha.id} AND status = 'Agendada'`;
}

async function publicarUma(sql: Sql, id: string, agora: Date): Promise<boolean> {
  const linha = await reivindicar(sql, id, agora);
  if (!linha) return false;

  if (linha.conta_status !== 'ok') {
    await falha(sql, linha, new ErroMeta('A conta não está com Ok. Sincronize de novo antes de publicar.'), agora);
    return false;
  }

  let token: string;
  try {
    token = decifrarToken(comoBuffer(linha.token_ciphertext), comoBuffer(linha.token_iv));
  } catch (erro) {
    const mensagem = erro instanceof ErroDominio ? erro.message : 'Não foi possível ler o token salvo.';
    await falha(sql, linha, new ErroMeta(mensagem), agora);
    return false;
  }

  try {
    let containerId = linha.container_id;
    if (!containerId) {
      const midiaUrl = await linkAcessivel(linha.media_url);
      if (!midiaUrl) throw new ErroMeta('Não foi possível preparar o arquivo para a Meta.');
      const criado = await clienteMeta().criarContainer(token, {
        igUserId: linha.ig_user_id,
        formato: linha.media_kind,
        legenda: linha.caption ?? '',
        midiaUrl,
      });
      containerId = criado.containerId;
      await sql`
        UPDATE post_schedules
        SET container_id = ${containerId}, updated_at = now()
        WHERE id = ${linha.id} AND status = 'Agendada'`;
    }

    const publicado = await clienteMeta().publicarContainer(token, linha.ig_user_id, containerId);
    const gravou = await sql`
      UPDATE post_schedules SET
        status = 'Publicada',
        ig_media_id = ${publicado.igMediaId},
        container_id = ${containerId},
        published_at = ${agora},
        publish_error = NULL,
        publish_claimed_at = NULL,
        updated_at = now()
      WHERE id = ${linha.id} AND status = 'Agendada' AND ig_media_id IS NULL
      RETURNING id`;
    return gravou.length > 0;
  } catch (erro) {
    const meta = erro instanceof ErroMeta ? erro : new ErroMeta('Não foi possível publicar.');
    await falha(sql, { ...linha, container_id: meta.containerId ?? linha.container_id }, meta, agora);
    return false;
  }
}

/** Publica o que já venceu. Reusa o container e não duplica uma publicação já confirmada. */
export const publicarPostagensInstagram: HandlerJob = async ({ sql, agora }) => {
  const candidatos = await sql<{ id: string }[]>`
    SELECT ps.id
    FROM post_schedules ps
    JOIN instagram_accounts ia ON ia.id = ps.instagram_account_id
    JOIN meta_portfolios mp ON mp.id = ia.portfolio_id
    WHERE ps.status = 'Agendada'
      AND ps.ig_media_id IS NULL
      AND ps.media_url IS NOT NULL
      AND ps.media_kind IS NOT NULL
      AND ps.scheduled_at <= ${agora}
      AND ps.publish_attempts < ${LIMITE_FATAL}
      AND mp.token_ciphertext IS NOT NULL
      AND (ps.publish_claimed_at IS NULL OR ps.publish_claimed_at < ${agora}::timestamptz - interval '2 minutes')
    ORDER BY ps.scheduled_at
    LIMIT 10`;

  let afetados = 0;
  for (const candidato of candidatos) {
    if (await publicarUma(sql, candidato.id, agora)) afetados += 1;
  }
  return { afetados };
};
