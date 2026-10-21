import type postgres from 'postgres';

/**
 * Seed sintético para desenvolvimento, testes e preview. Nenhum dado de pessoa real.
 * Os Usuários são criados SEM PIN (pin_hash NULL, troca obrigatória): defina um PIN de
 * desenvolvimento com `pnpm db:seed --pin` (gera PIN provisório e imprime só no terminal local).
 */

export const USUARIOS_SINTETICOS = [
  { email: 'admin@exemplo.test', name: 'Admin Exemplo', profile: 'Administrador', editor_label: null },
  { email: 'editor@exemplo.test', name: 'Editor Exemplo', profile: 'Editor', editor_label: 'Editor Exemplo' },
  { email: 'editor.cortes@exemplo.test', name: 'Editora Cortes Exemplo', profile: 'Editor', editor_label: 'Editora Cortes' },
  { email: 'influencer@exemplo.test', name: 'Influencer Exemplo', profile: 'Influencer', editor_label: null },
  { email: 'premios@exemplo.test', name: 'Prêmios Exemplo', profile: 'Premios', editor_label: null },
] as const;

export const FORMATOS = ['Reels', 'Stories', 'Vídeo longo', 'Ficha técnica', 'Cortes', 'Carrossel'] as const;

export async function aplicarSeed(sql: postgres.Sql): Promise<void> {
  await sql.begin(async (tx) => {
    for (const u of USUARIOS_SINTETICOS) {
      await tx`
        INSERT INTO users (email, name, profile, editor_label)
        VALUES (${u.email}, ${u.name}, ${u.profile}, ${u.editor_label})
        ON CONFLICT (email) DO NOTHING`;
    }
    for (const [i, valor] of FORMATOS.entries()) {
      await tx`
        INSERT INTO system_lists (kind, value, position) VALUES ('formato', ${valor}, ${i})
        ON CONFLICT (kind, value) DO NOTHING`;
    }
    await tx`
      INSERT INTO user_permissions (user_id, permission_key, granted)
      SELECT id, p.chave, true FROM users,
        (VALUES ('editorPadraoCortes'), ('acessarCortes'), ('verAbaCortes')) AS p(chave)
      WHERE email = 'editor.cortes@exemplo.test'
      ON CONFLICT DO NOTHING`;
  });
}
