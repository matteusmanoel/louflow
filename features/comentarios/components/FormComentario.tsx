'use client';

import { useActionState, useRef } from 'react';
import { Aviso, Botao } from '@/components/ui';
import { adicionarComentario } from '../actions';
import s from './ComentariosSecao.module.css';

type Estado = { mensagem: string; ok: boolean } | null;

export function FormComentario({ demandaId }: { demandaId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, acao, pendente] = useActionState<Estado, FormData>(
    async (_prev: Estado, fd: FormData) => {
      const resultado = await adicionarComentario({
        demandaId: fd.get('demandaId'),
        conteudo: fd.get('conteudo'),
      });
      if (resultado.ok) formRef.current?.reset();
      return { mensagem: resultado.mensagem, ok: resultado.ok };
    },
    null,
  );

  return (
    <form ref={formRef} action={acao} className={s.form}>
      <input type="hidden" name="demandaId" value={demandaId} />
      {estado ? (
        <Aviso tipo={estado.ok ? 'aviso' : 'erro'}>{estado.mensagem}</Aviso>
      ) : null}
      <textarea
        name="conteudo"
        className={s.textarea}
        placeholder="Escreva um comentário…"
        rows={3}
        maxLength={2000}
        required
        disabled={pendente}
        aria-label="Conteúdo do comentário"
      />
      <div className={s.formRodape}>
        <Botao type="submit" disabled={pendente}>
          {pendente ? 'Enviando…' : 'Comentar'}
        </Botao>
      </div>
    </form>
  );
}
