import 'server-only';

const COTA_PADRAO = 20 * 1024 * 1024 * 1024;
const FATOR_COTA: Record<string, number> = { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 };

/** Inteiro em bytes, ou número com sufixo KB/MB/GB/TB na base 1024. `1TB` = 1024⁴. */
export function lerCotaBytes(bruto: string | undefined): number {
  const texto = bruto?.trim() ?? '';
  if (!texto) return COTA_PADRAO;
  const inteiro = /^(\d+)$/.exec(texto);
  if (inteiro) {
    const valor = Number(inteiro[1]);
    return Number.isSafeInteger(valor) ? valor : COTA_PADRAO;
  }
  const comUnidade = /^(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb)$/i.exec(texto);
  const unidade = comUnidade?.[2];
  if (!comUnidade || !unidade) return COTA_PADRAO;
  const valor = Math.round(Number(comUnidade[1]) * FATOR_COTA[unidade.toLowerCase()]!);
  return Number.isSafeInteger(valor) && valor >= 0 ? valor : COTA_PADRAO;
}

function obrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return valor;
}

export const env = {
  get databaseUrl() {
    return obrigatoria('DATABASE_URL');
  },
  get pinPepper() {
    const valor = obrigatoria('PIN_PEPPER');
    if (valor.length < 32) throw new Error('PIN_PEPPER deve ter ao menos 32 caracteres');
    return valor;
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? '';
  },
  /** Cifra o token do Business Manager. Ausente ou curta: a tela não salva token. */
  get metaTokenKey() {
    const valor = process.env.META_TOKEN_KEY?.trim() ?? '';
    return valor.length >= 32 ? valor : null;
  },
  get producao() {
    return process.env.NODE_ENV === 'production';
  },
  /** Teto da equipe no Drive, em bytes. Ausente ou inválido = 20 GB. Aceita inteiro ou sufixo KB, MB, GB, TB. */
  get cotaDriveBytes() {
    return lerCotaBytes(process.env.DRIVE_COTA_BYTES);
  },
  /** Bucket privado de arquivos. Ausente = a tela só aceita link externo. */
  get armazenamento() {
    const bucket = process.env.S3_BUCKET?.trim() ?? '';
    if (!bucket) return null;
    const regiao = process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim() || 'us-east-1';
    return { bucket, regiao };
  },
};
