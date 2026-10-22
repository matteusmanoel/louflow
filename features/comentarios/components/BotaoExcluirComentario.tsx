'use client';

import { useActionState } from 'react';
import { Botao } from '@/components/ui';
import { excluirComentario } from '../actions';

type Estado = { mensagem: string; ok: boolean } | null;

export function BotaoExcluirComentario({ comentarioId }: { comentarioId: string }) {
  const [, acao, pendente] = useActionState<Estado, FormData>(
    async (_prev: Estado, fd: FormData) => {
      const resultado = await excluirComentario({ comentarioId: fd.get('comentarioId') as string });
      return { mensagem: resultado.mensagem, ok: resultado.ok };
    },
    null,
  );

  return (
    <form action={acao} style={{ display: 'inline' }}>
      <input type="hidden" name="comentarioId" value={comentarioId} />
      <Botao
        type="submit"
        variante="neutro"
        disabled={pendente}
        aria-label="Excluir comentário"
        style={{ fontSize: '11px', padding: '2px 8px' }}
      >
        {pendente ? '…' : 'Excluir'}
      </Botao>
    </form>
  );
}
