'use client';

import { useActionState } from 'react';
import { Aviso, Botao, Campo, Cartao } from '@/components/ui';
import { criarReserva } from '../actions';

type Estado = { mensagem: string; ok: boolean } | null;

export function FormReserva() {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(
    async (_prev: Estado, fd: FormData) => {
      const resultado = await criarReserva({
        startsAt: fd.get('startsAt'),
        endsAt: fd.get('endsAt'),
        reason: fd.get('reason'),
      });
      return { mensagem: resultado.mensagem, ok: resultado.ok };
    },
    null,
  );

  return (
    <Cartao>
      <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800 }}>Nova Reserva</h2>
      <form action={acao} style={{ display: 'grid', gap: '12px' }}>
        {estado ? (
          <Aviso tipo={estado.ok ? 'aviso' : 'erro'}>{estado.mensagem}</Aviso>
        ) : null}
        <Campo
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          rotulo="Início"
          required
        />
        <Campo
          id="endsAt"
          name="endsAt"
          type="datetime-local"
          rotulo="Fim"
          required
        />
        <Campo
          id="reason"
          name="reason"
          type="text"
          rotulo="Motivo"
          placeholder="Descreva o uso da Mídia Móvel"
          required
        />
        <Botao type="submit" disabled={pendente}>
          {pendente ? 'Reservando…' : 'Reservar'}
        </Botao>
      </form>
    </Cartao>
  );
}
