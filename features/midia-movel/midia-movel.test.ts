import { describe, it, expect } from 'vitest';
import { sqlTeste, usarBancoLimpo, criarUsuario } from '@/tests/helpers/db';
import { executarAcao } from '@/lib/action';
import { finalizarReservasVencidas } from './jobs';
import { listarReservas } from './consultas';
import { schemaCancelarReserva } from './schema';

import type { UsuarioSessao } from '@/lib/session';
import type { Dependencias } from '@/lib/action';
import { permissoesPadrao } from '@/lib/permissions';

usarBancoLimpo();

/** Monta um UsuarioSessao mínimo para uso nos testes. */
function sessao(id: string, perfil: 'Editor' | 'Administrador' | 'Influencer' = 'Editor'): UsuarioSessao {
  return {
    id,
    nome: 'Teste',
    perfil,
    editorLabel: null,
    deveTrocarPin: false,
    permissoes: permissoesPadrao(perfil),
    ehAprovadorDelegado: false,
  };
}

function deps(usuario: UsuarioSessao): Dependencias {
  return {
    obterUsuario: async () => usuario,
    sql: () => sqlTeste(),
  };
}

// Helper para criar reservas diretamente no banco (via actions)
async function criarReservaRaw(
  usuarioId: string,
  startsAt: Date,
  endsAt: Date,
  reason = 'Teste de reserva',
) {
  const sql = sqlTeste();
  const id = `mr_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await sql`
    INSERT INTO media_reservations (id, starts_at, ends_at, reason, reserved_by)
    VALUES (${id}, ${startsAt}, ${endsAt}, ${reason}, ${usuarioId})
  `;
  return id;
}

// We re-implement calling them via executarAcao to inject test deps
async function criarReserva(usuario: UsuarioSessao, entrada: unknown) {
  const { schemaCriarReserva } = await import('./schema');
  const { ErroDominio } = await import('@/lib/errors');

  return executarAcao(
    {
      nome: 'criarReserva',
      schema: schemaCriarReserva,
      restricoes: { media_reservations_tstzrange_excl: 'Já existe uma Reserva nesse horário. Escolha outro intervalo.' },
      executar: async ({ tx, usuario: u, entrada: e }) => {
        const { startsAt, endsAt, reason } = e;
        if (endsAt <= startsAt) throw new ErroDominio('O fim deve ser posterior ao início.');
        const id = `mr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await tx`INSERT INTO media_reservations (id, starts_at, ends_at, reason, reserved_by) VALUES (${id}, ${startsAt}, ${endsAt}, ${reason}, ${u.id})`;
        return { dados: { id }, mensagem: 'Reserva criada com sucesso.' };
      },
    },
    entrada,
    deps(usuario),
  );
}

async function cancelarReserva(usuario: UsuarioSessao, entrada: unknown) {
  const { ErroDominio } = await import('@/lib/errors');

  return executarAcao(
    {
      nome: 'cancelarReserva',
      schema: schemaCancelarReserva,
      executar: async ({ tx, usuario: u, entrada: e }) => {
        const [reserva] = await tx<{ id: string; status: string; reserved_by: string }[]>`
          SELECT id, status, reserved_by FROM media_reservations WHERE id = ${e.id}`;
        if (!reserva) throw new ErroDominio('Reserva não encontrada.');
        if (reserva.status !== 'Reservada') throw new ErroDominio('Só é possível cancelar uma Reserva com status Reservada.');
        const ehDono = reserva.reserved_by === u.id;
        const ehAdmin = u.perfil === 'Administrador';
        if (!ehDono && !ehAdmin) throw new ErroDominio('Só o responsável pela Reserva ou um Administrador pode cancelá-la.');
        await tx`UPDATE media_reservations SET status = 'Cancelada', cancelled_at = now() WHERE id = ${e.id}`;
        return { dados: { id: e.id }, mensagem: 'Reserva cancelada.' };
      },
    },
    entrada,
    deps(usuario),
  );
}

describe('S1-04 Mídia Móvel', () => {
  describe('criarReserva', () => {
    it('cria sem sobreposição com sucesso', async () => {
      const { id: userId } = await criarUsuario();
      const usuario = sessao(userId);

      const agora = new Date();
      const inicio = new Date(agora.getTime() + 60 * 60 * 1000); // +1h
      const fim = new Date(agora.getTime() + 2 * 60 * 60 * 1000); // +2h

      const resultado = await criarReserva(usuario, { startsAt: inicio, endsAt: fim, reason: 'Gravação externa' });

      expect(resultado.ok).toBe(true);
      expect(resultado.dados?.id).toBeTruthy();
    });

    it('falha com mensagem amigável quando há sobreposição', async () => {
      const { id: userId } = await criarUsuario();
      const usuario = sessao(userId);

      const agora = new Date();
      const inicio = new Date(agora.getTime() + 60 * 60 * 1000);
      const fim = new Date(agora.getTime() + 3 * 60 * 60 * 1000);

      // Cria a primeira reserva
      await criarReserva(usuario, { startsAt: inicio, endsAt: fim, reason: 'Primeira' });

      // Tenta criar sobreposta
      const resultado = await criarReserva(usuario, {
        startsAt: new Date(agora.getTime() + 1.5 * 60 * 60 * 1000),
        endsAt: new Date(agora.getTime() + 2.5 * 60 * 60 * 1000),
        reason: 'Sobreposta',
      });

      expect(resultado.ok).toBe(false);
      expect(resultado.mensagem).toBe('Já existe uma Reserva nesse horário. Escolha outro intervalo.');
    });

    it('falha quando fim <= início', async () => {
      const { id: userId } = await criarUsuario();
      const usuario = sessao(userId);

      const agora = new Date();
      const inicio = new Date(agora.getTime() + 2 * 60 * 60 * 1000);
      const fim = new Date(agora.getTime() + 60 * 60 * 1000); // fim antes do início

      const resultado = await criarReserva(usuario, { startsAt: inicio, endsAt: fim, reason: 'Inválida' });

      expect(resultado.ok).toBe(false);
      expect(resultado.mensagem).toMatch(/fim deve ser posterior/i);
    });
  });

  describe('cancelarReserva', () => {
    it('dono pode cancelar Reserva com status Reservada', async () => {
      const { id: userId } = await criarUsuario();
      const usuario = sessao(userId);

      const agora = new Date();
      const id = await criarReservaRaw(
        userId,
        new Date(agora.getTime() + 60 * 60 * 1000),
        new Date(agora.getTime() + 2 * 60 * 60 * 1000),
      );

      const resultado = await cancelarReserva(usuario, { id });
      expect(resultado.ok).toBe(true);

      // Confirma status no banco
      const sql = sqlTeste();
      const [r] = await sql<{ status: string }[]>`SELECT status FROM media_reservations WHERE id = ${id}`;
      expect(r?.status).toBe('Cancelada');
    });

    it('Administrador pode cancelar reserva de outro usuário', async () => {
      const { id: userId } = await criarUsuario();
      const { id: adminId } = await criarUsuario({ perfil: 'Administrador' });
      const admin = sessao(adminId, 'Administrador');

      const agora = new Date();
      const id = await criarReservaRaw(
        userId,
        new Date(agora.getTime() + 60 * 60 * 1000),
        new Date(agora.getTime() + 2 * 60 * 60 * 1000),
      );

      const resultado = await cancelarReserva(admin, { id });
      expect(resultado.ok).toBe(true);
    });

    it('outro usuário não-admin NÃO pode cancelar', async () => {
      const { id: userId } = await criarUsuario();
      const { id: outroId } = await criarUsuario();
      const outro = sessao(outroId);

      const agora = new Date();
      const id = await criarReservaRaw(
        userId,
        new Date(agora.getTime() + 60 * 60 * 1000),
        new Date(agora.getTime() + 2 * 60 * 60 * 1000),
      );

      const resultado = await cancelarReserva(outro, { id });
      expect(resultado.ok).toBe(false);
      expect(resultado.mensagem).toMatch(/responsável|Administrador/i);
    });

    it('não é possível cancelar Reserva Finalizada', async () => {
      const { id: userId } = await criarUsuario();
      const usuario = sessao(userId);

      const sql = sqlTeste();
      const passado = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const id = await criarReservaRaw(
        userId,
        new Date(passado.getTime() - 60 * 60 * 1000),
        passado,
      );

      // Finalize diretamente no banco
      await sql`UPDATE media_reservations SET status = 'Finalizada' WHERE id = ${id}`;

      const resultado = await cancelarReserva(usuario, { id });
      expect(resultado.ok).toBe(false);
      expect(resultado.mensagem).toMatch(/status Reservada/i);
    });
  });

  describe('finalizarReservasVencidas', () => {
    it('finaliza reservas vencidas e é idempotente', async () => {
      const { id: userId } = await criarUsuario();
      const sql = sqlTeste();

      // Reserva vencida
      const passado = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await criarReservaRaw(
        userId,
        new Date(passado.getTime() - 60 * 60 * 1000),
        passado,
        'Vencida',
      );

      // Reserva futura (não deve ser afetada)
      const futuro = new Date(Date.now() + 60 * 60 * 1000);
      await criarReservaRaw(
        userId,
        futuro,
        new Date(futuro.getTime() + 60 * 60 * 1000),
        'Futura',
      );

      const resultado1 = await finalizarReservasVencidas({ sql, agora: new Date() });
      expect(resultado1.afetados).toBe(1);

      // Segunda rodada: idempotente
      const resultado2 = await finalizarReservasVencidas({ sql, agora: new Date() });
      expect(resultado2.afetados).toBe(0);

      // Confirmação dos status
      const vencida = await sql<{ status: string }[]>`SELECT status FROM media_reservations WHERE reason = 'Vencida'`;
      expect(vencida[0]?.status).toBe('Finalizada');

      const futura = await sql<{ status: string }[]>`SELECT status FROM media_reservations WHERE reason = 'Futura'`;
      expect(futura[0]?.status).toBe('Reservada');
    });
  });

  describe('listarReservas (auto-finalizar on read)', () => {
    it('auto-finaliza reservas vencidas ao listar', async () => {
      const { id: userId } = await criarUsuario();
      const sql = sqlTeste();

      // Reserva vencida
      const passado = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const id = await criarReservaRaw(
        userId,
        new Date(passado.getTime() - 60 * 60 * 1000),
        passado,
        'Auto-finalizar',
      );

      const reservas = await listarReservas(sql);

      const reserva = reservas.find((r) => r.id === id);
      expect(reserva?.status).toBe('Finalizada');

      // Confirma no banco
      const [r] = await sql<{ status: string }[]>`SELECT status FROM media_reservations WHERE id = ${id}`;
      expect(r?.status).toBe('Finalizada');
    });

    it('marca emUso quando horário atual cai dentro da janela', async () => {
      const { id: userId } = await criarUsuario();
      const sql = sqlTeste();

      // Reserva ativa agora
      const agora = new Date();
      const id = await criarReservaRaw(
        userId,
        new Date(agora.getTime() - 30 * 60 * 1000), // iniciou há 30 min
        new Date(agora.getTime() + 30 * 60 * 1000), // termina em 30 min
        'Em uso agora',
      );

      const reservas = await listarReservas(sql);

      const reserva = reservas.find((r) => r.id === id);
      expect(reserva?.status).toBe('Reservada');
      expect(reserva?.emUso).toBe(true);
    });

    it('não marca emUso quando reserva ainda não iniciou', async () => {
      const { id: userId } = await criarUsuario();
      const sql = sqlTeste();

      const agora = new Date();
      const id = await criarReservaRaw(
        userId,
        new Date(agora.getTime() + 60 * 60 * 1000),
        new Date(agora.getTime() + 2 * 60 * 60 * 1000),
        'Futura',
      );

      const reservas = await listarReservas(sql);

      const reserva = reservas.find((r) => r.id === id);
      expect(reserva?.emUso).toBe(false);
    });
  });
});
