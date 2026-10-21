import { describe, expect, it } from 'vitest';
import { aplicarMigrations, lerMigrations, MigrationAlterada } from '../db/runner';
import { infoErroBanco } from '@/lib/errors';
import { criarUsuario, sqlTeste, usarBancoLimpo } from './helpers/db';

usarBancoLimpo();

const hora = (h: number) => new Date(Date.UTC(2026, 10, 10, h));

describe('runner de migrations', () => {
  it('é idempotente: nada pendente depois do setup', async () => {
    expect(await aplicarMigrations(sqlTeste(), await lerMigrations())).toEqual([]);
  });

  it('recusa migration aplicada com conteúdo alterado', async () => {
    const arquivos = await lerMigrations();
    const alterados = arquivos.map((a, i) => (i === 0 ? { ...a, checksum: 'diferente' } : a));
    await expect(aplicarMigrations(sqlTeste(), alterados)).rejects.toBeInstanceOf(MigrationAlterada);
  });

  it('nomes seguem 0001_init ou AAAAMMDDHHMM_<task>_<slug>', async () => {
    for (const { nome } of await lerMigrations()) {
      expect(nome).toMatch(/^(0001_init|\d{12}_\d+_[a-z0-9-]+)\.sql$/);
    }
  });
});

describe('invariantes de agenda no banco', () => {
  it('rejeita Captações Agendadas sobrepostas do mesmo videomaker', async () => {
    const sql = sqlTeste();
    const v = await criarUsuario();
    await sql`INSERT INTO captures (id, starts_at, ends_at, videomaker_id, created_by)
              VALUES ('C1', ${hora(10)}, ${hora(12)}, ${v.id}, ${v.id})`;
    const erro = await sql`INSERT INTO captures (id, starts_at, ends_at, videomaker_id, created_by)
              VALUES ('C2', ${hora(11)}, ${hora(13)}, ${v.id}, ${v.id})`.catch((e: unknown) => e);
    expect(infoErroBanco(erro).codigo).toBe('23P01');
  });

  it('permite sobreposição com Captação cancelada ou de outro videomaker', async () => {
    const sql = sqlTeste();
    const v1 = await criarUsuario();
    const v2 = await criarUsuario();
    await sql`INSERT INTO captures (id, starts_at, ends_at, videomaker_id, created_by, status)
              VALUES ('C1', ${hora(10)}, ${hora(12)}, ${v1.id}, ${v1.id}, 'Cancelada')`;
    await sql`INSERT INTO captures (id, starts_at, ends_at, videomaker_id, created_by)
              VALUES ('C2', ${hora(11)}, ${hora(13)}, ${v1.id}, ${v1.id})`;
    await sql`INSERT INTO captures (id, starts_at, ends_at, videomaker_id, created_by)
              VALUES ('C3', ${hora(11)}, ${hora(13)}, ${v2.id}, ${v2.id})`;
    const [linha] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM captures`;
    expect(linha?.n).toBe(3);
  });

  it('permite Captações encostadas (fim = início)', async () => {
    const sql = sqlTeste();
    const v = await criarUsuario();
    await sql`INSERT INTO captures (id, starts_at, ends_at, videomaker_id, created_by)
              VALUES ('C1', ${hora(10)}, ${hora(12)}, ${v.id}, ${v.id})`;
    await expect(sql`INSERT INTO captures (id, starts_at, ends_at, videomaker_id, created_by)
              VALUES ('C2', ${hora(12)}, ${hora(13)}, ${v.id}, ${v.id})`).resolves.toBeDefined();
  });

  it('rejeita Reservas de Mídia Móvel sobrepostas, exceto canceladas', async () => {
    const sql = sqlTeste();
    const u = await criarUsuario();
    await sql`INSERT INTO media_reservations (id, starts_at, ends_at, reason, reserved_by)
              VALUES ('R1', ${hora(8)}, ${hora(10)}, 'gravação', ${u.id})`;
    const erro = await sql`INSERT INTO media_reservations (id, starts_at, ends_at, reason, reserved_by)
              VALUES ('R2', ${hora(9)}, ${hora(11)}, 'gravação', ${u.id})`.catch((e: unknown) => e);
    expect(infoErroBanco(erro).codigo).toBe('23P01');

    await sql`UPDATE media_reservations SET status = 'Cancelada' WHERE id = 'R1'`;
    await expect(sql`INSERT INTO media_reservations (id, starts_at, ends_at, reason, reserved_by)
              VALUES ('R2', ${hora(9)}, ${hora(11)}, 'gravação', ${u.id})`).resolves.toBeDefined();
  });

  it('só um Editor padrão de Cortes', async () => {
    const sql = sqlTeste();
    const a = await criarUsuario();
    const b = await criarUsuario();
    await sql`INSERT INTO user_permissions (user_id, permission_key, granted) VALUES (${a.id}, 'editorPadraoCortes', true)`;
    const erro = await sql`INSERT INTO user_permissions (user_id, permission_key, granted)
                           VALUES (${b.id}, 'editorPadraoCortes', true)`.catch((e: unknown) => e);
    expect(infoErroBanco(erro).codigo).toBe('23505');
  });
});
