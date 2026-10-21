/** Erro de regra de negócio: a mensagem é exibida ao Usuário e a transação é desfeita. */
export class ErroDominio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDominio';
  }
}

/** Código e restrição de erros do Postgres relevantes para traduzir em mensagem amigável. */
export function infoErroBanco(erro: unknown): { codigo?: string; restricao?: string } {
  if (typeof erro !== 'object' || erro === null) return {};
  const e = erro as { code?: unknown; constraint_name?: unknown };
  return {
    codigo: typeof e.code === 'string' ? e.code : undefined,
    restricao: typeof e.constraint_name === 'string' ? e.constraint_name : undefined,
  };
}
