import 'server-only';
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  EXPIRACAO_ENVIO_SEGUNDOS,
  EXPIRACAO_LEITURA_SEGUNDOS,
  chaveDaUrl,
  chavePermitida,
  idDonoSeguro,
  montarChave,
  nomeSeguro,
  urlDoObjeto,
  type GrupoArquivo,
} from './armazenamento-chave';
import { env } from './env';
import { ErroDominio } from './errors';

export {
  EXPIRACAO_ENVIO_SEGUNDOS,
  EXPIRACAO_LEITURA_SEGUNDOS,
  GRUPOS_ARQUIVO,
  LIMITE_ARQUIVOS,
  ROTULO_TAMANHO_MAXIMO,
  TAMANHO_MAXIMO_BYTES,
  TIPOS_ARQUIVO,
  chaveDaUrl,
  chaveDoDono,
  idDonoSeguro,
  montarChave,
  nomeDaUrl,
  nomeSeguro,
  novoIdPasta,
  urlDoObjeto,
} from './armazenamento-chave';
export type { GrupoArquivo, TipoArquivo } from './armazenamento-chave';

const MENSAGEM_SEM_ARMAZENAMENTO =
  'O armazenamento de arquivos não está configurado. Use um link externo.';

let clienteAtual: S3Client | undefined;
let regiaoAtual = '';

function obterCliente(regiao: string): S3Client {
  if (!clienteAtual || regiaoAtual !== regiao) {
    clienteAtual = new S3Client({
      region: regiao,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    regiaoAtual = regiao;
  }
  return clienteAtual;
}

function configuracao() {
  const cfg = env.armazenamento;
  if (!cfg) throw new ErroDominio(MENSAGEM_SEM_ARMAZENAMENTO);
  return cfg;
}

export async function prepararEnvio(entrada: { grupo: GrupoArquivo; donoId: string; nomeArquivo: string; tipo: string }) {
  const cfg = configuracao();
  if (!idDonoSeguro(entrada.donoId)) throw new ErroDominio('Identificador inválido.');
  const chave = montarChave(entrada.grupo, entrada.donoId, entrada.nomeArquivo);
  const comando = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: chave,
    ContentType: entrada.tipo,
  });
  const urlEnvio = await getSignedUrl(obterCliente(cfg.regiao), comando, { expiresIn: EXPIRACAO_ENVIO_SEGUNDOS });
  return { urlEnvio, urlArquivo: urlDoObjeto(cfg.bucket, cfg.regiao, chave) };
}

/** Remove objetos que não chegaram a ser gravados. Chave fora do contrato é ignorada. */
export async function removerObjetos(chaves: readonly string[]) {
  const permitidas = chaves.filter(chavePermitida);
  if (permitidas.length === 0) return;
  const cfg = configuracao();
  try {
    const resposta = await obterCliente(cfg.regiao).send(
      new DeleteObjectsCommand({
        Bucket: cfg.bucket,
        Delete: { Objects: permitidas.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    if (resposta.Errors?.length) throw new Error('falha ao remover');
  } catch (erro) {
    if (erro instanceof ErroDominio) throw erro;
    throw new ErroDominio('Não foi possível descartar os arquivos enviados.');
  }
}

/** Link externo permanece. Objeto do bucket vira URL temporária de leitura. */
export async function linkAcessivel(
  url: string | null,
  opcoes?: { baixar?: boolean; nome?: string },
): Promise<string | null> {
  if (!url) return null;
  const cfg = env.armazenamento;
  if (!cfg) return url;
  const chave = chaveDaUrl(url, cfg.bucket, cfg.regiao);
  if (!chave) return url;
  try {
    const bruto = opcoes?.nome ?? chave.split('/').pop() ?? 'arquivo';
    const nome = nomeSeguro(bruto).replace(/["\\\r\n]/g, '');
    const disposicao = opcoes?.baixar ? 'attachment' : 'inline';
    const comando = new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: chave,
      ResponseContentDisposition: `${disposicao}; filename="${nome}"`,
    });
    return await getSignedUrl(obterCliente(cfg.regiao), comando, { expiresIn: EXPIRACAO_LEITURA_SEGUNDOS });
  } catch {
    return url;
  }
}

/** Corpo do objeto para zip. Link externo e bucket ausente devolvem null. */
export async function lerObjeto(url: string): Promise<AsyncIterable<Uint8Array> | null> {
  const cfg = env.armazenamento;
  if (!cfg) return null;
  const chave = chaveDaUrl(url, cfg.bucket, cfg.regiao);
  if (!chave) return null;
  const resposta = await obterCliente(cfg.regiao).send(new GetObjectCommand({ Bucket: cfg.bucket, Key: chave }));
  const corpo = resposta.Body;
  if (!corpo || typeof (corpo as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] !== 'function') return null;
  return corpo as AsyncIterable<Uint8Array>;
}
