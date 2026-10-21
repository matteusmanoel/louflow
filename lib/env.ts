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
};
