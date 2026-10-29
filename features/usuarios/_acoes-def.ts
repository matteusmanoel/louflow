import 'server-only';
import type { DefinicaoAcao } from '@/lib/action';
import { registrarAuditoria } from '@/lib/audit';
import { ErroDominio } from '@/lib/errors';
import { definirPinProvisorio, invalidarAcessos } from '@/lib/session';
import {
  schemaAlterarAtivacao,
  schemaConcederPermissao,
  schemaCriarUsuario,
  schemaEditarUsuario,
  schemaGerenciarDelegados,
  schemaRedefinirPin,
} from './schema';

// ---------------------------------------------------------------------------
// Definições exportadas para uso em testes via executarAcao
// ---------------------------------------------------------------------------

export const defCriarUsuario: DefinicaoAcao<
  typeof schemaCriarUsuario,
  { pin: string; usuarioId: string }
> = {
  nome: 'criarUsuario',
  schema: schemaCriarUsuario,
  permissao: 'gerenciarUsuarios',
  restricoes: {
    users_email_key: 'Já existe um Usuário com esse e-mail.',
    users_editor_label_uq: 'Já existe um Editor com esse rótulo.',
  },
  executar: async ({ tx, usuario, entrada }) => {
    const [existente] = await tx<{ id: string }[]>`
      SELECT id FROM users WHERE email = ${entrada.email} LIMIT 1`;
    if (existente) throw new ErroDominio('Já existe um Usuário com esse e-mail.');

    const [criado] = await tx<{ id: string }[]>`
      INSERT INTO users (name, email, profile, editor_label, pin_hash, must_reset_pin, is_active)
      VALUES (${entrada.nome}, ${entrada.email}, ${entrada.perfil}, ${entrada.editorLabel ?? null},
              NULL, true, true)
      RETURNING id`;

    if (!criado) throw new ErroDominio('Não foi possível criar o Usuário.');

    // definirPinProvisorio grava o hash, define must_reset_pin=true e incrementa access_version.
    const pin = await definirPinProvisorio(tx, criado.id);

    await registrarAuditoria(tx, {
      acao: 'criar_usuario',
      usuarioId: usuario.id,
      alvo: criado.id,
      depois: { nome: entrada.nome, email: entrada.email, perfil: entrada.perfil },
    });

    return { dados: { pin, usuarioId: criado.id }, mensagem: 'Usuário criado. PIN provisório gerado.' };
  },
};

export const defEditarUsuario: DefinicaoAcao<typeof schemaEditarUsuario, null> = {
  nome: 'editarUsuario',
  schema: schemaEditarUsuario,
  permissao: 'gerenciarUsuarios',
  restricoes: {
    users_email_key: 'Já existe um Usuário com esse e-mail.',
    users_editor_label_uq: 'Já existe um Editor com esse rótulo.',
  },
  executar: async ({ tx, usuario, entrada }) => {
    const [antes] = await tx<{
      id: string;
      name: string;
      email: string;
      profile: string;
      editor_label: string | null;
    }[]>`
      SELECT id, name, email, profile, editor_label FROM users WHERE id = ${entrada.usuarioId} FOR UPDATE`;

    if (!antes) throw new ErroDominio('Usuário não encontrado.');

    const perfilMudou = antes.profile !== entrada.perfil;

    await tx`
      UPDATE users
         SET name         = ${entrada.nome},
             email        = ${entrada.email},
             profile      = ${entrada.perfil},
             editor_label = ${entrada.editorLabel ?? null},
             updated_at   = now()
       WHERE id = ${entrada.usuarioId}`;

    if (perfilMudou) {
      // Mudança de Perfil invalida todas as sessões (access_version++) e dispositivos.
      await invalidarAcessos(tx, entrada.usuarioId);
    }

    await registrarAuditoria(tx, {
      acao: 'editar_usuario',
      usuarioId: usuario.id,
      alvo: entrada.usuarioId,
      antes: { nome: antes.name, email: antes.email, perfil: antes.profile, editorLabel: antes.editor_label },
      depois: { nome: entrada.nome, email: entrada.email, perfil: entrada.perfil, editorLabel: entrada.editorLabel },
    });

    return { dados: null, mensagem: 'Usuário atualizado.' };
  },
};

export const defAtivarUsuario: DefinicaoAcao<typeof schemaAlterarAtivacao, null> = {
  nome: 'ativarUsuario',
  schema: schemaAlterarAtivacao,
  permissao: 'gerenciarUsuarios',
  executar: async ({ tx, usuario, entrada }) => {
    const [alvo] = await tx<{ id: string; is_active: boolean }[]>`
      SELECT id, is_active FROM users WHERE id = ${entrada.usuarioId} FOR UPDATE`;

    if (!alvo) throw new ErroDominio('Usuário não encontrado.');
    if (alvo.is_active) throw new ErroDominio('Usuário já está ativo.');

    await tx`UPDATE users SET is_active = true, updated_at = now() WHERE id = ${entrada.usuarioId}`;

    await registrarAuditoria(tx, {
      acao: 'ativar_usuario',
      usuarioId: usuario.id,
      alvo: entrada.usuarioId,
      antes: { ativo: false },
      depois: { ativo: true },
    });

    return { dados: null, mensagem: 'Usuário ativado.' };
  },
};

export const defDesativarUsuario: DefinicaoAcao<typeof schemaAlterarAtivacao, null> = {
  nome: 'desativarUsuario',
  schema: schemaAlterarAtivacao,
  permissao: 'gerenciarUsuarios',
  executar: async ({ tx, usuario, entrada }) => {
    const [alvo] = await tx<{ id: string; is_active: boolean }[]>`
      SELECT id, is_active FROM users WHERE id = ${entrada.usuarioId} FOR UPDATE`;

    if (!alvo) throw new ErroDominio('Usuário não encontrado.');
    if (!alvo.is_active) throw new ErroDominio('Usuário já está inativo.');
    if (alvo.id === usuario.id) throw new ErroDominio('Você não pode desativar a si mesmo.');

    await tx`UPDATE users SET is_active = false, updated_at = now() WHERE id = ${entrada.usuarioId}`;

    // Invalida todas as sessões e dispositivos confiáveis do Usuário desativado.
    await invalidarAcessos(tx, entrada.usuarioId);

    await registrarAuditoria(tx, {
      acao: 'desativar_usuario',
      usuarioId: usuario.id,
      alvo: entrada.usuarioId,
      antes: { ativo: true },
      depois: { ativo: false },
    });

    // Efeitos nas Demandas tratados por S1-15 (features/lote/actions.ts: desligarUsuario).
    return { dados: null, mensagem: 'Usuário desativado.' };
  },
};

export const defConcederPermissao: DefinicaoAcao<typeof schemaConcederPermissao, null> = {
  nome: 'concederPermissao',
  schema: schemaConcederPermissao,
  permissao: 'gerenciarUsuarios',
  restricoes: {
    user_permissions_one_clips_editor: 'Já existe um Editor padrão de Cortes. Remova o atual antes de conceder.',
  },
  executar: async ({ tx, usuario, entrada }) => {
    const [alvo] = await tx<{ id: string }[]>`
      SELECT id FROM users WHERE id = ${entrada.usuarioId} FOR UPDATE`;

    if (!alvo) throw new ErroDominio('Usuário não encontrado.');

    const [antes] = await tx<{ granted: boolean }[]>`
      SELECT granted FROM user_permissions
       WHERE user_id = ${entrada.usuarioId} AND permission_key = ${entrada.chave}`;

    await tx`
      INSERT INTO user_permissions (user_id, permission_key, granted, updated_by, updated_at)
      VALUES (${entrada.usuarioId}, ${entrada.chave}, ${entrada.concedida}, ${usuario.id}, now())
      ON CONFLICT (user_id, permission_key)
      DO UPDATE SET granted = ${entrada.concedida}, updated_by = ${usuario.id}, updated_at = now()`;

    // Mudança de permissão invalida todas as sessões do Usuário.
    await invalidarAcessos(tx, entrada.usuarioId);

    await registrarAuditoria(tx, {
      acao: 'alterar_permissao',
      usuarioId: usuario.id,
      alvo: entrada.usuarioId,
      antes: { chave: entrada.chave, concedida: antes?.granted ?? null },
      depois: { chave: entrada.chave, concedida: entrada.concedida },
    });

    const msg = entrada.concedida ? 'Permissão concedida.' : 'Permissão revogada.';
    return { dados: null, mensagem: msg };
  },
};

export const defGerenciarDelegados: DefinicaoAcao<typeof schemaGerenciarDelegados, null> = {
  nome: 'gerenciarDelegados',
  schema: schemaGerenciarDelegados,
  permissao: 'gerenciarUsuarios',
  executar: async ({ tx, usuario, entrada }) => {
    if (entrada.aprovadorId === entrada.editorId) {
      throw new ErroDominio('O Aprovador Delegado não pode ser o mesmo Editor.');
    }

    const [aprovador] = await tx<{ id: string }[]>`
      SELECT id FROM users WHERE id = ${entrada.aprovadorId} AND is_active = true FOR UPDATE`;
    if (!aprovador) throw new ErroDominio('Aprovador não encontrado ou inativo.');

    const [editor] = await tx<{ id: string }[]>`
      SELECT id FROM users WHERE id = ${entrada.editorId} AND is_active = true`;
    if (!editor) throw new ErroDominio('Editor não encontrado ou inativo.');

    if (entrada.adicionar) {
      await tx`
        INSERT INTO approval_delegations (approver_id, editor_id)
        VALUES (${entrada.aprovadorId}, ${entrada.editorId})
        ON CONFLICT DO NOTHING`;

      await registrarAuditoria(tx, {
        acao: 'adicionar_delegado',
        usuarioId: usuario.id,
        alvo: entrada.aprovadorId,
        depois: { editorId: entrada.editorId },
      });

      return { dados: null, mensagem: 'Delegado adicionado.' };
    } else {
      await tx`
        DELETE FROM approval_delegations
         WHERE approver_id = ${entrada.aprovadorId} AND editor_id = ${entrada.editorId}`;

      await registrarAuditoria(tx, {
        acao: 'remover_delegado',
        usuarioId: usuario.id,
        alvo: entrada.aprovadorId,
        antes: { editorId: entrada.editorId },
      });

      return { dados: null, mensagem: 'Delegado removido.' };
    }
  },
};

export const defRedefinirPin: DefinicaoAcao<typeof schemaRedefinirPin, { pin: string; usuarioId: string }> = {
  nome: 'redefinirPin',
  schema: schemaRedefinirPin,
  permissao: 'gerenciarUsuarios',
  executar: async ({ tx, usuario, entrada }) => {
    const [alvo] = await tx<{ id: string; is_active: boolean }[]>`
      SELECT id, is_active FROM users WHERE id = ${entrada.usuarioId} FOR UPDATE`;

    if (!alvo) throw new ErroDominio('Usuário não encontrado.');
    if (!alvo.is_active) throw new ErroDominio('Não é possível redefinir o PIN de um Usuário inativo.');

    // definirPinProvisorio: define must_reset_pin=true e incrementa access_version via invalidarAcessos.
    const pin = await definirPinProvisorio(tx, entrada.usuarioId);

    await registrarAuditoria(tx, {
      acao: 'redefinir_pin',
      usuarioId: usuario.id,
      alvo: entrada.usuarioId,
      // PIN e hash nunca entram em auditoria; sanitizarEstado os remove automaticamente.
    });

    return {
      dados: { pin, usuarioId: entrada.usuarioId },
      mensagem: 'PIN provisório gerado. Mostre ao Usuário uma única vez.',
    };
  },
};
