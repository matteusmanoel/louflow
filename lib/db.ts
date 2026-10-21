import 'server-only';
import postgres from 'postgres';
import { env } from './env';

export type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;
/** Conexão ou transação: funções de consulta aceitam qualquer uma das duas. */
export type Db = Sql | Tx;

let cliente: Sql | undefined;

export function criarCliente(url: string, opcoes: postgres.Options<Record<string, never>> = {}): Sql {
  return postgres(url, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    // Compatível com o pooler da Neon (modo transação).
    prepare: false,
    onnotice: () => {},
    ...opcoes,
  });
}

export function db(): Sql {
  cliente ??= criarCliente(env.databaseUrl);
  return cliente;
}

/** Substitui o cliente global (testes). */
export function definirCliente(novo: Sql | undefined) {
  cliente = novo;
}

export async function emTransacao<T>(fn: (tx: Tx) => Promise<T>, sql: Sql = db()): Promise<T> {
  return (await sql.begin((tx) => fn(tx))) as T;
}
