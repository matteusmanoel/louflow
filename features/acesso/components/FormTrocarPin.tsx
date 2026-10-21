'use client';

import { useActionState } from 'react';
import { Aviso, Botao, Campo } from '@/components/ui';
import { trocarPin, type EstadoFormulario } from '../actions';
import s from '@/app/(auth)/auth.module.css';

export function FormTrocarPin() {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(trocarPin, null);

  return (
    <form action={acao} className={s.form} noValidate>
      {estado?.mensagem ? <Aviso tipo="erro">{estado.mensagem}</Aviso> : null}
      <Campo id="pin" name="pin" type="password" rotulo="Novo PIN (6 dígitos)" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="new-password" required />
      <Campo id="confirmacao" name="confirmacao" type="password" rotulo="Confirme o novo PIN" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="new-password" required />
      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Salvando…' : 'Definir PIN'}
      </Botao>
    </form>
  );
}
