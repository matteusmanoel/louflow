import { afterAll, beforeEach } from 'vitest';
import { criarCliente, definirCliente, type Sql } from '@/lib/db';
import { gerarHashPin } from '@/lib/pin';
import type { Perfil } from '@/lib/permissions';

let cliente: Sql | undefined;

/** Cliente do banco de teste, compartilhado pelo arquivo de teste e injetado em lib/db. */
export function sqlTeste(): Sql {
  if (!cliente) {
    cliente = criarCliente(process.env.DATABASE_URL!, { max: 3 });
    definirCliente(cliente);
  }
  return cliente;
}

/** Registra limpeza entre testes e encerramento da conexão. Chame no topo do arquivo de teste. */
export function usarBancoLimpo() {
  beforeEach(async () => {
    const sql = sqlTeste();
    const tabelas = await sql<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations'`;
    await sql.unsafe(`TRUNCATE ${tabelas.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  });
  afterAll(async () => {
    await cliente?.end();
    cliente = undefined;
    definirCliente(undefined);
  });
}

let contador = 0;

export async function criarUsuario(
  opcoes: { perfil?: Perfil; pin?: string | null; ativo?: boolean; deveTrocarPin?: boolean; nome?: string } = {},
): Promise<{ id: string; email: string }> {
  contador += 1;
  const email = `usuario${contador}@exemplo.test`;
  const pinHash = opcoes.pin === null ? null : await gerarHashPin(opcoes.pin ?? '482916');
  const [u] = await sqlTeste()<{ id: string }[]>`
    INSERT INTO users (email, name, profile, pin_hash, must_reset_pin, is_active)
    VALUES (${email}, ${opcoes.nome ?? `Usuário ${contador}`}, ${opcoes.perfil ?? 'Editor'}, ${pinHash},
            ${opcoes.deveTrocarPin ?? false}, ${opcoes.ativo ?? true})
    RETURNING id`;
  return { id: u!.id, email };
}
