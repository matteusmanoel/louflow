import { db } from '@/lib/db';
import type { ChavePermissao, Perfil } from '@/lib/permissions';

export type UsuarioListado = {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  editorLabel: string | null;
  ativo: boolean;
  deveTrocarPin: boolean;
  criadoEm: Date;
};

export type ConcessaoUsuario = {
  chave: ChavePermissao;
  concedida: boolean;
};

export type DelegadoEntry = {
  aprovadorId: string;
  aprovadorNome: string;
  editorId: string;
  editorNome: string;
};

export type UsuarioDetalhe = UsuarioListado & {
  permissoes: ConcessaoUsuario[];
  delegacoesComo: { editorId: string; editorNome: string }[];
};

export async function listarUsuarios(): Promise<UsuarioListado[]> {
  const sql = db();
  const rows = await sql<
    {
      id: string;
      name: string;
      email: string;
      profile: string;
      editor_label: string | null;
      is_active: boolean;
      must_reset_pin: boolean;
      created_at: Date;
    }[]
  >`
    SELECT id, name, email, profile, editor_label, is_active, must_reset_pin, created_at
      FROM users
     ORDER BY name`;
  return rows.map((r) => ({
    id: r.id,
    nome: r.name,
    email: r.email,
    perfil: r.profile as Perfil,
    editorLabel: r.editor_label,
    ativo: r.is_active,
    deveTrocarPin: r.must_reset_pin,
    criadoEm: r.created_at,
  }));
}

export async function buscarUsuario(id: string): Promise<UsuarioDetalhe | null> {
  const sql = db();
  const [rows, permRows, delegRows] = await Promise.all([
    sql<
      {
        id: string;
        name: string;
        email: string;
        profile: string;
        editor_label: string | null;
        is_active: boolean;
        must_reset_pin: boolean;
        created_at: Date;
      }[]
    >`
      SELECT id, name, email, profile, editor_label, is_active, must_reset_pin, created_at
        FROM users WHERE id = ${id}`,
    sql<{ permission_key: string; granted: boolean }[]>`
      SELECT permission_key, granted FROM user_permissions WHERE user_id = ${id}`,
    sql<{ editor_id: string; editor_name: string }[]>`
      SELECT d.editor_id, u.name AS editor_name
        FROM approval_delegations d
        JOIN users u ON u.id = d.editor_id
       WHERE d.approver_id = ${id}
       ORDER BY u.name`,
  ]);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    nome: row.name,
    email: row.email,
    perfil: row.profile as Perfil,
    editorLabel: row.editor_label,
    ativo: row.is_active,
    deveTrocarPin: row.must_reset_pin,
    criadoEm: row.created_at,
    permissoes: permRows.map((p) => ({ chave: p.permission_key as ChavePermissao, concedida: p.granted })),
    delegacoesComo: delegRows.map((d) => ({ editorId: d.editor_id, editorNome: d.editor_name })),
  };
}
