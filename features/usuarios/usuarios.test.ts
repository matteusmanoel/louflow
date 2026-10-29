import { describe, expect, it } from 'vitest';
import { executarAcao } from '@/lib/action';
import type { Permissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario as criarUsuarioHelper, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import {
  defAtivarUsuario,
  defConcederPermissao,
  defCriarUsuario,
  defDesativarUsuario,
  defEditarUsuario,
  defGerenciarDelegados,
  defRedefinirPin,
} from './_acoes-def';
import { buscarUsuario, listarUsuarios } from './consultas';

usarBancoLimpo();

// ---------------------------------------------------------------------------
// Helpers de teste
// ---------------------------------------------------------------------------

const PERMISSOES_VAZIAS: Permissoes = {
  criarDemandas: false,
  definirOutroEditor: false,
  verTodasDemandas: false,
  editarDemandas: false,
  atribuirEditor: false,
  alterarStatus: false,
  alterarPrioridade: false,
  excluirDemandas: false,
  enviarFicha: false,
  verAgenda: false,
  gerenciarAgenda: false,
  verCaptacoes: false,
  gerenciarCaptacoes: false,
  acessarCortes: false,
  verAbaCortes: false,
  verRelatorios: false,
  usarAnalista: false,
  gerenciarUsuarios: false,
  verLixeira: false,
  verSorteios: false,
  operarDrone: false,
  editorPadraoCortes: false,
  notaInformativaRanking: false,
};

function sessao(
  id: string,
  opts: { permissoes?: Partial<Permissoes>; perfil?: UsuarioSessao['perfil'] } = {},
): UsuarioSessao {
  return {
    id,
    nome: 'Usuário Teste',
    perfil: opts.perfil ?? 'Administrador',
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: { ...PERMISSOES_VAZIAS, ...opts.permissoes },
    ehAprovadorDelegado: false,
  };
}

function deps(usuarioSessao: UsuarioSessao) {
  return {
    obterUsuario: async () => usuarioSessao,
    sql: () => sqlTeste(),
  };
}

// ---------------------------------------------------------------------------
// criarUsuario
// ---------------------------------------------------------------------------
describe('criarUsuario', () => {
  it('cria Usuário com gerenciarUsuarios e retorna PIN provisório de 6 dígitos', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });

    const res = await executarAcao(
      defCriarUsuario,
      { nome: 'Editor Teste', email: 'editor@exemplo.test', perfil: 'Editor' },
      deps(admin),
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.dados.pin).toMatch(/^\d{6}$/);
    expect(res.dados.usuarioId).toBeTruthy();

    // Usuário criado com must_reset_pin=true (PIN provisório)
    const [row] = await sqlTeste()<{ must_reset_pin: boolean; is_active: boolean }[]>`
      SELECT must_reset_pin, is_active FROM users WHERE id = ${res.dados.usuarioId}`;
    expect(row?.must_reset_pin).toBe(true);
    expect(row?.is_active).toBe(true);

    // Auditoria gravada na mesma transação
    const [audit] = await sqlTeste()<{ action: string }[]>`
      SELECT action FROM audit_log WHERE target = ${res.dados.usuarioId}`;
    expect(audit?.action).toBe('criar_usuario');
  });

  it('rejeita criação sem permissão gerenciarUsuarios', async () => {
    const { id: editorId } = await criarUsuarioHelper({ perfil: 'Editor' });
    const editor = sessao(editorId, { permissoes: { gerenciarUsuarios: false } });

    const res = await executarAcao(
      defCriarUsuario,
      { nome: 'Novo', email: 'novo@exemplo.test', perfil: 'Editor' },
      deps(editor),
    );

    expect(res.ok).toBe(false);
    expect(res.mensagem).toContain('permissão');
  });

  it('rejeita criação com e-mail já existente', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });

    // Cria o primeiro com sucesso
    const res1 = await executarAcao(
      defCriarUsuario,
      { nome: 'Editor A', email: 'duplicado@exemplo.test', perfil: 'Editor' },
      deps(admin),
    );
    expect(res1.ok).toBe(true);

    // Tenta criar novamente com o mesmo e-mail
    const res2 = await executarAcao(
      defCriarUsuario,
      { nome: 'Editor B', email: 'duplicado@exemplo.test', perfil: 'Editor' },
      deps(admin),
    );

    expect(res2.ok).toBe(false);
    expect(res2.mensagem).toContain('e-mail');
  });
});

// ---------------------------------------------------------------------------
// redefinirPin
// ---------------------------------------------------------------------------
describe('redefinirPin', () => {
  it('define must_reset_pin=true e incrementa access_version', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });
    const { id: alvoId } = await criarUsuarioHelper({ perfil: 'Editor', deveTrocarPin: false });

    const [antes] = await sqlTeste()<{ access_version: number; must_reset_pin: boolean }[]>`
      SELECT access_version, must_reset_pin FROM users WHERE id = ${alvoId}`;

    const res = await executarAcao(defRedefinirPin, { usuarioId: alvoId }, deps(admin));

    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.dados.pin).toMatch(/^\d{6}$/);

    const [depois] = await sqlTeste()<{ access_version: number; must_reset_pin: boolean }[]>`
      SELECT access_version, must_reset_pin FROM users WHERE id = ${alvoId}`;

    expect(depois?.must_reset_pin).toBe(true);
    expect(depois?.access_version).toBeGreaterThan(antes?.access_version ?? 0);

    // Auditoria gravada (sem PIN, sem hash — sanitização automática)
    const [audit] = await sqlTeste()<{ action: string; after: string | null }[]>`
      SELECT action, after FROM audit_log WHERE target = ${alvoId} AND action = 'redefinir_pin'`;
    expect(audit).toBeTruthy();
    expect(audit?.after).toBeNull(); // campo depois não deve conter dados de PIN
  });

  it('falha sem permissão gerenciarUsuarios', async () => {
    const { id: editorId } = await criarUsuarioHelper({ perfil: 'Editor' });
    const editor = sessao(editorId, { permissoes: { gerenciarUsuarios: false } });
    const { id: alvoId } = await criarUsuarioHelper({ perfil: 'Editor' });

    const res = await executarAcao(defRedefinirPin, { usuarioId: alvoId }, deps(editor));

    expect(res.ok).toBe(false);
    expect(res.mensagem).toContain('permissão');
  });

  it('falha ao tentar redefinir PIN de usuário inativo', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });
    const { id: alvoId } = await criarUsuarioHelper({ perfil: 'Editor', ativo: false });

    const res = await executarAcao(defRedefinirPin, { usuarioId: alvoId }, deps(admin));

    expect(res.ok).toBe(false);
    expect(res.mensagem).toContain('inativo');
  });
});

// ---------------------------------------------------------------------------
// concederPermissao / revogarPermissao
// ---------------------------------------------------------------------------
describe('concederPermissao', () => {
  it('grava permissão e incrementa access_version do alvo', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });
    const { id: alvoId } = await criarUsuarioHelper({ perfil: 'Editor' });

    const [antes] = await sqlTeste()<{ access_version: number }[]>`
      SELECT access_version FROM users WHERE id = ${alvoId}`;

    const res = await executarAcao(
      defConcederPermissao,
      { usuarioId: alvoId, chave: 'criarDemandas', concedida: true },
      deps(admin),
    );

    expect(res.ok).toBe(true);

    // Permissão gravada na tabela user_permissions
    const [perm] = await sqlTeste()<{ granted: boolean }[]>`
      SELECT granted FROM user_permissions WHERE user_id = ${alvoId} AND permission_key = 'criarDemandas'`;
    expect(perm?.granted).toBe(true);

    // access_version incrementado (invalida sessões)
    const [depois] = await sqlTeste()<{ access_version: number }[]>`
      SELECT access_version FROM users WHERE id = ${alvoId}`;
    expect(depois?.access_version).toBeGreaterThan(antes?.access_version ?? 0);

    // Auditoria gravada
    const [audit] = await sqlTeste()<{ action: string }[]>`
      SELECT action FROM audit_log WHERE target = ${alvoId} AND action = 'alterar_permissao'`;
    expect(audit).toBeTruthy();
  });

  it('revoga permissão existente', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });
    const { id: alvoId } = await criarUsuarioHelper({ perfil: 'Editor' });

    // Concede primeiro
    await executarAcao(
      defConcederPermissao,
      { usuarioId: alvoId, chave: 'verRelatorios', concedida: true },
      deps(admin),
    );

    // Revoga
    const res = await executarAcao(
      defConcederPermissao,
      { usuarioId: alvoId, chave: 'verRelatorios', concedida: false },
      deps(admin),
    );

    expect(res.ok).toBe(true);

    const [perm] = await sqlTeste()<{ granted: boolean }[]>`
      SELECT granted FROM user_permissions WHERE user_id = ${alvoId} AND permission_key = 'verRelatorios'`;
    expect(perm?.granted).toBe(false);
  });

  it('falha sem permissão gerenciarUsuarios', async () => {
    const { id: editorId } = await criarUsuarioHelper({ perfil: 'Editor' });
    const editor = sessao(editorId, { permissoes: { gerenciarUsuarios: false } });
    const { id: alvoId } = await criarUsuarioHelper({ perfil: 'Editor' });

    const res = await executarAcao(
      defConcederPermissao,
      { usuarioId: alvoId, chave: 'criarDemandas', concedida: true },
      deps(editor),
    );

    expect(res.ok).toBe(false);
    expect(res.mensagem).toContain('permissão');
  });
});

// ---------------------------------------------------------------------------
// ativarUsuario / desativarUsuario
// ---------------------------------------------------------------------------
describe('ativarUsuario', () => {
  it('ativa usuário inativo e grava auditoria', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });
    const { id: alvoId } = await criarUsuarioHelper({ perfil: 'Editor', ativo: false });

    const res = await executarAcao(defAtivarUsuario, { usuarioId: alvoId }, deps(admin));

    expect(res.ok).toBe(true);

    const [row] = await sqlTeste()<{ is_active: boolean }[]>`
      SELECT is_active FROM users WHERE id = ${alvoId}`;
    expect(row?.is_active).toBe(true);

    const [audit] = await sqlTeste()<{ action: string; before: string | null; after: string | null }[]>`
      SELECT action, before, after FROM audit_log WHERE target = ${alvoId} AND action = 'ativar_usuario'`;
    expect(audit).toBeTruthy();
    expect(audit?.after).toContain('true');
  });

  it('falha ao ativar usuário já ativo', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });
    const { id: alvoId } = await criarUsuarioHelper({ perfil: 'Editor', ativo: true });

    const res = await executarAcao(defAtivarUsuario, { usuarioId: alvoId }, deps(admin));

    expect(res.ok).toBe(false);
    expect(res.mensagem).toContain('já está ativo');
  });
});

describe('desativarUsuario', () => {
  it('desativa usuário, invalida sessões e grava auditoria', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });
    const { id: alvoId } = await criarUsuarioHelper({ perfil: 'Editor', ativo: true });

    // Cria uma sessão fictícia para o usuário alvo
    await sqlTeste()`
      INSERT INTO session_tokens (token_digest, user_id, access_version, expires_at)
      SELECT 'digest_' || gen_random_uuid(), ${alvoId}, access_version, now() + interval '6 hours'
      FROM users WHERE id = ${alvoId}`;

    const res = await executarAcao(defDesativarUsuario, { usuarioId: alvoId }, deps(admin));

    expect(res.ok).toBe(true);

    const [row] = await sqlTeste()<{ is_active: boolean }[]>`
      SELECT is_active FROM users WHERE id = ${alvoId}`;
    expect(row?.is_active).toBe(false);

    // Sessão deve ter sido removida (invalidarAcessos)
    const [cnt] = await sqlTeste()<{ count: string }[]>`
      SELECT count(*)::text FROM session_tokens WHERE user_id = ${alvoId}`;
    expect(Number(cnt?.count)).toBe(0);

    // Auditoria gravada
    const [audit] = await sqlTeste()<{ action: string }[]>`
      SELECT action FROM audit_log WHERE target = ${alvoId} AND action = 'desativar_usuario'`;
    expect(audit).toBeTruthy();
  });

  it('falha ao desativar a si mesmo', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });

    const res = await executarAcao(defDesativarUsuario, { usuarioId: adminId }, deps(admin));

    expect(res.ok).toBe(false);
    expect(res.mensagem).toContain('si mesmo');
  });

  it('falha sem permissão gerenciarUsuarios', async () => {
    const { id: editorId } = await criarUsuarioHelper({ perfil: 'Editor' });
    const editor = sessao(editorId, { permissoes: { gerenciarUsuarios: false } });
    const { id: alvoId } = await criarUsuarioHelper({ perfil: 'Editor' });

    const res = await executarAcao(defDesativarUsuario, { usuarioId: alvoId }, deps(editor));

    expect(res.ok).toBe(false);
    expect(res.mensagem).toContain('permissão');
  });
});

// ---------------------------------------------------------------------------
// editarUsuario
// ---------------------------------------------------------------------------
describe('editarUsuario', () => {
  it('edita usuário e grava auditoria', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });
    const { id: alvoId, email } = await criarUsuarioHelper({ perfil: 'Editor' });

    const res = await executarAcao(
      defEditarUsuario,
      { usuarioId: alvoId, nome: 'Nome Editado', email, perfil: 'Editor', editorLabel: 'Ed' },
      deps(admin),
    );

    expect(res.ok).toBe(true);

    const [row] = await sqlTeste()<{ name: string; editor_label: string | null }[]>`
      SELECT name, editor_label FROM users WHERE id = ${alvoId}`;
    expect(row?.name).toBe('Nome Editado');
    expect(row?.editor_label).toBe('Ed');

    const [audit] = await sqlTeste()<{ action: string }[]>`
      SELECT action FROM audit_log WHERE target = ${alvoId} AND action = 'editar_usuario'`;
    expect(audit).toBeTruthy();
  });

  it('mudança de perfil incrementa access_version', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });
    const { id: alvoId, email } = await criarUsuarioHelper({ perfil: 'Editor' });

    const [antes] = await sqlTeste()<{ access_version: number }[]>`
      SELECT access_version FROM users WHERE id = ${alvoId}`;

    await executarAcao(
      defEditarUsuario,
      { usuarioId: alvoId, nome: 'Nome', email, perfil: 'Influencer' },
      deps(admin),
    );

    const [depois] = await sqlTeste()<{ access_version: number }[]>`
      SELECT access_version FROM users WHERE id = ${alvoId}`;

    expect(depois?.access_version).toBeGreaterThan(antes?.access_version ?? 0);
  });
});

// ---------------------------------------------------------------------------
// gerenciarDelegados
// ---------------------------------------------------------------------------
describe('gerenciarDelegados', () => {
  it('adiciona e remove delegado com auditoria', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });
    const { id: aprovadorId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const { id: editorId } = await criarUsuarioHelper({ perfil: 'Editor' });

    // Adiciona delegado
    const addRes = await executarAcao(
      defGerenciarDelegados,
      { aprovadorId, editorId, adicionar: true },
      deps(admin),
    );
    expect(addRes.ok).toBe(true);

    const [delegacao] = await sqlTeste()<{ approver_id: string }[]>`
      SELECT approver_id FROM approval_delegations
       WHERE approver_id = ${aprovadorId} AND editor_id = ${editorId}`;
    expect(delegacao).toBeTruthy();

    // Remove delegado
    const removeRes = await executarAcao(
      defGerenciarDelegados,
      { aprovadorId, editorId, adicionar: false },
      deps(admin),
    );
    expect(removeRes.ok).toBe(true);

    const [removido] = await sqlTeste()<{ approver_id: string }[]>`
      SELECT approver_id FROM approval_delegations
       WHERE approver_id = ${aprovadorId} AND editor_id = ${editorId}`;
    expect(removido).toBeUndefined();

    // Auditoria das duas operações
    const auditorias = await sqlTeste()<{ action: string }[]>`
      SELECT action FROM audit_log WHERE target = ${aprovadorId} ORDER BY id`;
    const acoes = auditorias.map((a) => a.action);
    expect(acoes).toContain('adicionar_delegado');
    expect(acoes).toContain('remover_delegado');
  });

  it('falha ao tentar delegar para si mesmo', async () => {
    const { id: adminId } = await criarUsuarioHelper({ perfil: 'Administrador' });
    const admin = sessao(adminId, { permissoes: { gerenciarUsuarios: true } });

    const res = await executarAcao(
      defGerenciarDelegados,
      { aprovadorId: adminId, editorId: adminId, adicionar: true },
      deps(admin),
    );

    expect(res.ok).toBe(false);
    expect(res.mensagem).toContain('mesmo');
  });
});

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------
describe('listarUsuarios', () => {
  it('retorna usuários ordenados por nome', async () => {
    await criarUsuarioHelper({ perfil: 'Editor', nome: 'Zara' });
    await criarUsuarioHelper({ perfil: 'Influencer', nome: 'Ana' });

    const usuarios = await listarUsuarios();
    const nomes = usuarios.map((u) => u.nome);

    expect(nomes.indexOf('Ana')).toBeLessThan(nomes.indexOf('Zara'));
  });
});

describe('buscarUsuario', () => {
  it('retorna null para ID inexistente', async () => {
    const resultado = await buscarUsuario('00000000-0000-0000-0000-000000000000');
    expect(resultado).toBeNull();
  });

  it('retorna detalhe com permissões gravadas', async () => {
    const { id: alvoId } = await criarUsuarioHelper({ perfil: 'Editor' });

    await sqlTeste()`
      INSERT INTO user_permissions (user_id, permission_key, granted)
      VALUES (${alvoId}, 'criarDemandas', true)`;

    const detalhe = await buscarUsuario(alvoId);
    expect(detalhe).not.toBeNull();
    expect(detalhe?.permissoes).toContainEqual({ chave: 'criarDemandas', concedida: true });
  });
});
