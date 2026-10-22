'use server';

import { criarAcao } from '@/lib/action';
import { ErroDominio } from '@/lib/errors';
import { schemaCriarReserva, schemaCancelarReserva } from './schema';

const RESTRICAO_SOBREPOSICAO = 'media_reservations_tstzrange_excl';
const MSG_SOBREPOSICAO = 'Já existe uma Reserva nesse horário. Escolha outro intervalo.';

/** Cria uma Reserva de Mídia Móvel. Qualquer Usuário autenticado pode reservar. */
export const criarReserva = criarAcao({
  nome: 'criarReserva',
  schema: schemaCriarReserva,
  restricoes: { [RESTRICAO_SOBREPOSICAO]: MSG_SOBREPOSICAO },
  executar: async ({ tx, usuario, entrada }) => {
    const { startsAt, endsAt, reason } = entrada;

    if (endsAt <= startsAt) {
      throw new ErroDominio('O fim deve ser posterior ao início.');
    }

    const id = `mr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await tx`
      INSERT INTO media_reservations (id, starts_at, ends_at, reason, reserved_by)
      VALUES (${id}, ${startsAt}, ${endsAt}, ${reason}, ${usuario.id})
    `;

    return { dados: { id }, mensagem: 'Reserva criada com sucesso.' };
  },
});

/** Cancela uma Reserva de Mídia Móvel. Só o dono ou Administrador pode cancelar, e somente se Reservada. */
export const cancelarReserva = criarAcao({
  nome: 'cancelarReserva',
  schema: schemaCancelarReserva,
  executar: async ({ tx, usuario, entrada }) => {
    const [reserva] = await tx<
      { id: string; status: string; reserved_by: string }[]
    >`
      SELECT id, status, reserved_by FROM media_reservations WHERE id = ${entrada.id}
    `;

    if (!reserva) {
      throw new ErroDominio('Reserva não encontrada.');
    }

    if (reserva.status !== 'Reservada') {
      throw new ErroDominio('Só é possível cancelar uma Reserva com status Reservada.');
    }

    const ehDono = reserva.reserved_by === usuario.id;
    const ehAdmin = usuario.perfil === 'Administrador';

    if (!ehDono && !ehAdmin) {
      throw new ErroDominio('Só o responsável pela Reserva ou um Administrador pode cancelá-la.');
    }

    await tx`
      UPDATE media_reservations
         SET status = 'Cancelada', cancelled_at = now()
       WHERE id = ${entrada.id}
    `;

    return { dados: { id: entrada.id }, mensagem: 'Reserva cancelada.' };
  },
});
