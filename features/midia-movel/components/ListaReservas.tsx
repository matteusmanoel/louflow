'use client';

import { useActionState } from 'react';
import { Aviso, Botao, Cartao, TextoSuave } from '@/components/ui';
import { cancelarReserva } from '../actions';
import type { ReservaMidiaMovel } from '../consultas';
import s from './ListaReservas.module.css';

type Estado = { mensagem: string; ok: boolean } | null;

function formatarHorario(d: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

function BadgeStatus({ status, emUso }: { status: ReservaMidiaMovel['status']; emUso: boolean }) {
  if (emUso) return <span className={s.badgeEmUso}>Em uso</span>;
  if (status === 'Reservada') return <span className={s.badgeReservada}>Reservada</span>;
  if (status === 'Finalizada') return <span className={s.badgeFinalizada}>Finalizada</span>;
  return <span className={s.badgeCancelada}>Cancelada</span>;
}

function LinhaReserva({
  reserva,
  usuarioId,
  ehAdmin,
}: {
  reserva: ReservaMidiaMovel;
  usuarioId: string;
  ehAdmin: boolean;
}) {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(
    async (_prev: Estado, fd: FormData) => {
      const resultado = await cancelarReserva({ id: fd.get('id') as string });
      return { mensagem: resultado.mensagem, ok: resultado.ok };
    },
    null,
  );

  const podeCancelar = reserva.status === 'Reservada' && (reserva.reservedBy === usuarioId || ehAdmin);

  return (
    <Cartao className={s.linha}>
      <div className={s.topo}>
        <div>
          <strong>{reserva.reason}</strong>
          <TextoSuave>
            {formatarHorario(reserva.startsAt)} → {formatarHorario(reserva.endsAt)}
          </TextoSuave>
          <TextoSuave>Por: {reserva.reservedByName}</TextoSuave>
        </div>
        <BadgeStatus status={reserva.status} emUso={reserva.emUso} />
      </div>

      {estado ? (
        <Aviso tipo={estado.ok ? 'aviso' : 'erro'}>{estado.mensagem}</Aviso>
      ) : null}

      {podeCancelar ? (
        <form action={acao} style={{ marginTop: '8px' }}>
          <input type="hidden" name="id" value={reserva.id} />
          <Botao type="submit" variante="neutro" disabled={pendente}>
            {pendente ? 'Cancelando…' : 'Cancelar Reserva'}
          </Botao>
        </form>
      ) : null}
    </Cartao>
  );
}

export function ListaReservas({
  reservas,
  usuarioId,
  ehAdmin,
}: {
  reservas: ReservaMidiaMovel[];
  usuarioId: string;
  ehAdmin: boolean;
}) {
  if (reservas.length === 0) {
    return <TextoSuave>Nenhuma reserva encontrada.</TextoSuave>;
  }

  return (
    <div className={s.lista}>
      {reservas.map((r) => (
        <LinhaReserva key={r.id} reserva={r} usuarioId={usuarioId} ehAdmin={ehAdmin} />
      ))}
    </div>
  );
}
