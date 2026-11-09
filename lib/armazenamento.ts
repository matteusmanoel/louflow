import 'server-only';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  EXPIRACAO_ENVIO_SEGUNDOS,
  EXPIRACAO_LEITURA_SEGUNDOS,
  chaveDaUrl,
  idDonoSeguro,
  montarChave,
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

/** Link externo permanece. Objeto do bucket vira URL temporária de leitura. */
export async function linkAcessivel(url: string | null): Promise<string | null> {
  if (!url) return null;
  const cfg = env.armazenamento;
  if (!cfg) return url;
  const chave = chaveDaUrl(url, cfg.bucket, cfg.regiao);
  if (!chave) return url;
  try {
    const nome = (chave.split('/').pop() ?? 'arquivo').replace(/["\\\r\n]/g, '');
    const comando = new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: chave,
      ResponseContentDisposition: `inline; filename="${nome}"`,
    });
    return await getSignedUrl(obterCliente(cfg.regiao), comando, { expiresIn: EXPIRACAO_LEITURA_SEGUNDOS });
  } catch {
    return url;
  }
}
