import { describe, expect, it } from 'vitest';
import { executarAcao } from '@/lib/action';
import type { Permissoes } from '@/lib/permissions';
import type { UsuarioSessao } from '@/lib/session';
import { criarUsuario, sqlTeste, usarBancoLimpo } from '@/tests/helpers/db';
import { desligarUsuario, processarLoteDesligamento } from './index';
import { defLoteDesligamento } from './actions';

usarBancoLimpo();

// ---------------------------------------------------------------------------
// Helpers
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
};

function sessao(id: string, perm: Partial<Permissoes> = {}): UsuarioSessao {
  return {
    id,
    nome: 'Admin Teste',
    perfil: 'Administrador',
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: { ...PERMISSOES_VAZIAS, ...perm },
    ehAprovadorDelegado: false,
  };
}

function deps(s: UsuarioSessao) {
  return { obterUsuario: async () => s, sql: () => sqlTeste() };
}

let demandaSeq = 0;

/** Insere uma Demanda diretamente via sqlTeste (auto-commit). */
async function criarDemanda(opts: {
  editorId?: string | null;
  influencerId?: string | null;
  status?: string;
  criadorId: string;
}): Promise<string> {
  demandaSeq += 1;
  const id = `LF${demandaSeq.toString(16).padStart(10, '0')}`;
  const status = opts.status ?? 'Não iniciada';
  const sql = sqlTeste();
  if (status === 'Concluída') {
    // A constraint demands_check exige completed_at NOT NULL quando status = 'Concluída'.
    await sql`
      INSERT INTO demands (id, title, format, editor_id, influencer_id, status, completed_at, created_by)
      VALUES (${id}, ${'Demanda ' + demandaSeq}, 'Reels',
              ${opts.editorId ?? null}, ${opts.influencerId ?? null},
              ${status}, now(), ${opts.criadorId})`;
  } else {
    await sql`
      INSERT INTO demands (id, title, format, editor_id, influencer_id, status, created_by)
      VALUES (${id}, ${'Demanda ' + demandaSeq}, 'Reels',
              ${opts.editorId ?? null}, ${opts.influencerId ?? null},
              ${status}, ${opts.criadorId})`;
  }
  return id;
}

/** Insere uma Captação diretamente via sqlTeste (auto-commit). */
async function criarCaptacao(opts: {
  videomakerId: string;
  status?: string;
  futuro?: boolean;
}): Promise<string> {
  demandaSeq += 1;
  const id = `CAP${demandaSeq}`;
  const base = opts.futuro !== false ? "now() + interval '1 day'" : "now() - interval '2 days'";
  await sqlTeste().unsafe(`
    INSERT INTO captures (id, starts_at, ends_at, videomaker_id, status, created_by)
    VALUES ('${id}', ${base}, ${base} + interval '2 hours',
            '${opts.videomakerId}', '${opts.status ?? 'Agendada'}', '${opts.videomakerId}')
  `);
  return id;
}

/** Insere uma Reserva de Mídia Móvel diretamente via sqlTeste (auto-commit). */
async function criarReservaMedia(opts: {
  reservadoPor: string;
  status?: string;
  futuro?: boolean;
}): Promise<string> {
  demandaSeq += 1;
  const id = `RES${demandaSeq}`;
  const base = opts.futuro !== false ? "now() + interval '2 days'" : "now() - interval '3 days'";
  await sqlTeste().unsafe(`
    INSERT INTO media_reservations (id, starts_at, ends_at, reason, reserved_by, status)
    VALUES ('${id}', ${base}, ${base} + interval '3 hours',
            'Gravação', '${opts.reservadoPor}', '${opts.status ?? 'Reservada'}')
  `);
  return id;
}

/** Abre uma transação usando o cliente de teste para chamar desligarUsuario. */
async function emTx(usuarioId: string, operadorId: string): Promise<void> {
  await sqlTeste().begin((tx) => desligarUsuario(tx, usuarioId, operadorId));
}

// ---------------------------------------------------------------------------
// desligarUsuario — Demandas em edição → Cancelada
// ---------------------------------------------------------------------------

describe('desligarUsuario — demandas em edição são canceladas', () => {
  it('Não iniciada → Cancelada', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const editor = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda({ editorId: editor.id, status: 'Não iniciada', criadorId: admin.id });

    await emTx(editor.id, admin.id);

    const [d] = await sqlTeste()<{ status: string }[]>`SELECT status FROM demands WHERE id = ${demandaId}`;
    expect(d?.status).toBe('Cancelada');
  });

  it('Em execução → Cancelada', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const editor = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda({ editorId: editor.id, status: 'Em execução', criadorId: admin.id });

    await emTx(editor.id, admin.id);

    const [d] = await sqlTeste()<{ status: string }[]>`SELECT status FROM demands WHERE id = ${demandaId}`;
    expect(d?.status).toBe('Cancelada');
  });

  it('Pausada → Cancelada', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const editor = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda({ editorId: editor.id, status: 'Pausada', criadorId: admin.id });

    await emTx(editor.id, admin.id);

    const [d] = await sqlTeste()<{ status: string }[]>`SELECT status FROM demands WHERE id = ${demandaId}`;
    expect(d?.status).toBe('Cancelada');
  });

  it('Ajustes solicitados → Cancelada', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const editor = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda({ editorId: editor.id, status: 'Ajustes solicitados', criadorId: admin.id });

    await emTx(editor.id, admin.id);

    const [d] = await sqlTeste()<{ status: string }[]>`SELECT status FROM demands WHERE id = ${demandaId}`;
    expect(d?.status).toBe('Cancelada');
  });
});

// ---------------------------------------------------------------------------
// desligarUsuario — Demandas em aprovação → remove atribuição
// ---------------------------------------------------------------------------

describe('desligarUsuario — demandas em Aprovação têm atribuição removida', () => {
  it('Aprovação com editor → editor_id = null, status inalterado', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const editor = await criarUsuario({ perfil: 'Editor' });
    const demandaId = await criarDemanda({ editorId: editor.id, status: 'Aprovação', criadorId: admin.id });

    await emTx(editor.id, admin.id);

    const [d] = await sqlTeste()<{ status: string; editor_id: string | null }[]>`
      SELECT status, editor_id FROM demands WHERE id = ${demandaId}`;
    expect(d?.status).toBe('Aprovação');
    expect(d?.editor_id).toBeNull();
  });

  it('Aprovação com influencer → influencer_id = null, status inalterado', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const influencer = await criarUsuario({ perfil: 'Influencer' });
    const demandaId = await criarDemanda({ influencerId: influencer.id, status: 'Aprovação', criadorId: admin.id });

    await emTx(influencer.id, admin.id);

    const [d] = await sqlTeste()<{ status: string; influencer_id: string | null }[]>`
      SELECT status, influencer_id FROM demands WHERE id = ${demandaId}`;
    expect(d?.status).toBe('Aprovação');
    expect(d?.influencer_id).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// desligarUsuario — Demandas terminais não são afetadas
// ---------------------------------------------------------------------------

describe('desligarUsuario — demandas terminais não são tocadas', () => {
  it.each(['Concluída', 'Reprovada', 'Cancelada'] as const)(
    'status %s permanece inalterado',
    async (statusInicial) => {
      const admin = await criarUsuario({ perfil: 'Administrador' });
      const editor = await criarUsuario({ perfil: 'Editor' });
      const demandaId = await criarDemanda({ editorId: editor.id, status: statusInicial, criadorId: admin.id });

      await emTx(editor.id, admin.id);

      const [d] = await sqlTeste()<{ status: string; editor_id: string | null }[]>`
        SELECT status, editor_id FROM demands WHERE id = ${demandaId}`;
      expect(d?.status).toBe(statusInicial);
      // editor_id permanece (demanda terminal não é aberta)
      expect(d?.editor_id).toBe(editor.id);
    },
  );
});

// ---------------------------------------------------------------------------
// desligarUsuario — Captações e Reservas
// ---------------------------------------------------------------------------

describe('desligarUsuario — cancela captações e reservas futuras', () => {
  it('cancela captações futuras Agendadas', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const vm = await criarUsuario({ perfil: 'Editor' });
    const capFutId = await criarCaptacao({ videomakerId: vm.id, futuro: true });
    const capPassId = await criarCaptacao({ videomakerId: vm.id, futuro: false });

    await emTx(vm.id, admin.id);

    const [fut] = await sqlTeste()<{ status: string }[]>`SELECT status FROM captures WHERE id = ${capFutId}`;
    const [pass] = await sqlTeste()<{ status: string }[]>`SELECT status FROM captures WHERE id = ${capPassId}`;
    expect(fut?.status).toBe('Cancelada');
    expect(pass?.status).toBe('Agendada'); // passada não é afetada
  });

  it('não cancela captações já Concluídas ou Canceladas', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const vm = await criarUsuario({ perfil: 'Editor' });
    const capConcluidaId = await criarCaptacao({ videomakerId: vm.id, status: 'Concluída', futuro: true });

    await emTx(vm.id, admin.id);

    const [c] = await sqlTeste()<{ status: string }[]>`SELECT status FROM captures WHERE id = ${capConcluidaId}`;
    expect(c?.status).toBe('Concluída');
  });

  it('cancela reservas de mídia futuras', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const user = await criarUsuario({ perfil: 'Editor' });
    const resFutId = await criarReservaMedia({ reservadoPor: user.id, futuro: true });

    await emTx(user.id, admin.id);

    const [r] = await sqlTeste()<{ status: string; cancelled_at: Date | null }[]>`
      SELECT status, cancelled_at FROM media_reservations WHERE id = ${resFutId}`;
    expect(r?.status).toBe('Cancelada');
    expect(r?.cancelled_at).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// desligarUsuario — is_active e auditoria
// ---------------------------------------------------------------------------

describe('desligarUsuario — efeitos em is_active e auditoria', () => {
  it('marca o usuário como inativo', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const editor = await criarUsuario({ perfil: 'Editor', ativo: true });

    await emTx(editor.id, admin.id);

    const [u] = await sqlTeste()<{ is_active: boolean }[]>`
      SELECT is_active FROM users WHERE id = ${editor.id}`;
    expect(u?.is_active).toBe(false);
  });

  it('é idempotente se usuário já estiver inativo', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const editor = await criarUsuario({ perfil: 'Editor', ativo: false });

    await expect(emTx(editor.id, admin.id)).resolves.toBeUndefined();
  });

  it('grava registro de auditoria com acao=desligamento', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const editor = await criarUsuario({ perfil: 'Editor' });

    await emTx(editor.id, admin.id);

    const [audit] = await sqlTeste()<{ action: string; user_id: string; target: string }[]>`
      SELECT action, user_id, target FROM audit_log WHERE action = 'desligamento'`;
    expect(audit?.action).toBe('desligamento');
    expect(audit?.user_id).toBe(admin.id);
    expect(audit?.target).toBe(editor.id);
  });
});

// ---------------------------------------------------------------------------
// processarLoteDesligamento — comportamento de lote
// ---------------------------------------------------------------------------

describe('processarLoteDesligamento', () => {
  it('processa todos os usuários com sucesso', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const u1 = await criarUsuario({ perfil: 'Editor' });
    const u2 = await criarUsuario({ perfil: 'Editor' });

    const res = await processarLoteDesligamento([u1.id, u2.id], admin.id);

    expect(res.processados).toBe(2);
    expect(res.erros).toHaveLength(0);
  });

  it('é idempotente: reprocessar um usuário já desligado não gera erro', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const u1 = await criarUsuario({ perfil: 'Editor' });

    const res = await processarLoteDesligamento([u1.id, u1.id], admin.id);

    // Ambas as iterações devem ter sucesso (UPDATE 0 rows é válido)
    expect(res.erros).toHaveLength(0);
    expect(res.processados).toBe(2);
  });

  it('retorna lista vazia de erros em lote bem-sucedido', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const u = await criarUsuario({ perfil: 'Editor' });

    const res = await processarLoteDesligamento([u.id], admin.id);

    expect(res.processados).toBe(1);
    expect(res.erros).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Server Action — permissão gerenciarUsuarios
// ---------------------------------------------------------------------------

describe('Server Action loteDesligamento — permissão', () => {
  it('recusa sem permissão gerenciarUsuarios', async () => {
    const user = await criarUsuario({ perfil: 'Editor' });
    const alvo = await criarUsuario({ perfil: 'Editor' });
    const s = sessao(user.id, { gerenciarUsuarios: false });

    const res = await executarAcao(defLoteDesligamento, { usuarioIds: [alvo.id] }, deps(s));

    expect(res.ok).toBe(false);
  });

  it('aceita com permissão gerenciarUsuarios', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const alvo = await criarUsuario({ perfil: 'Editor' });
    const s = sessao(admin.id, { gerenciarUsuarios: true });

    const res = await executarAcao(defLoteDesligamento, { usuarioIds: [alvo.id] }, deps(s));

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.dados.processados).toBe(1);
    }
  });

  it('rejeita lista vazia (validação Zod)', async () => {
    const admin = await criarUsuario({ perfil: 'Administrador' });
    const s = sessao(admin.id, { gerenciarUsuarios: true });

    const res = await executarAcao(defLoteDesligamento, { usuarioIds: [] }, deps(s));

    expect(res.ok).toBe(false);
  });
});
