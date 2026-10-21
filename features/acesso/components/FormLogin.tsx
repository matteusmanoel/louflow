'use client';

import { useActionState } from 'react';
import { Aviso, Botao, Campo } from '@/components/ui';
import { entrar, type EstadoFormulario } from '../actions';
import s from '@/app/(auth)/auth.module.css';

export function FormLogin({ para }: { para?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(entrar, null);

  return (
    <form action={acao} className={s.form} noValidate>
      {estado?.mensagem ? <Aviso tipo="erro">{estado.mensagem}</Aviso> : null}
      <input type="hidden" name="para" value={para ?? '/'} />
      <Campo id="email" name="email" type="email" rotulo="E-mail" autoComplete="username" required />
      <Campo id="pin" name="pin" type="password" rotulo="PIN" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="current-password" required />
      <label className={s.lembrar}>
        <input type="checkbox" name="lembrar" /> Confiar neste dispositivo por 30 dias
      </label>
      <Botao type="submit" disabled={pendente}>
        {pendente ? 'Entrando…' : 'Entrar'}
      </Botao>
    </form>
  );
}
