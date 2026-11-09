import 'server-only';

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
  get producao() {
    return process.env.NODE_ENV === 'production';
  },
  /** Bucket privado de arquivos. Ausente = a tela só aceita link externo. */
  get armazenamento() {
    const bucket = process.env.S3_BUCKET?.trim() ?? '';
    if (!bucket) return null;
    const regiao = process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim() || 'us-east-1';
    return { bucket, regiao };
  },
};
