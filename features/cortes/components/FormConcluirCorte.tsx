'use client';

import { useTransition, useState } from 'react';
import { Campo, Botao, Aviso } from '@/components/ui';
import { concluirCorte } from '../actions';
import type { Corte } from '../consultas';
import s from './cortes.module.css';

export function FormConcluirCorte({ corte, aoSalvar }: { corte: Corte; aoSalvar?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'aviso' | 'erro' } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const resultado = await concluirCorte({
        id: corte.id,
        quantidadeProduzida: Number(fd.get('quantidadeProduzida')),
      });

      if (resultado.ok) {
        setMensagem({ texto: resultado.mensagem, tipo: 'aviso' });
        aoSalvar?.();
      } else {
        setMensagem({ texto: resultado.mensagem, tipo: 'erro' });
      }
    });
  }

  if (corte.status === 'Concluído') return null;

  return (
    <form onSubmit={handleSubmit} className={s.formulario} aria-label={`Concluir corte ${corte.titulo}`}>
      {mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}

      <div className={s.grade}>
        <Campo
          rotulo="Quantidade Produzida *"
          id={`qtd-${corte.id}`}
          name="quantidadeProduzida"
          type="number"
          min={1}
          max={999}
          required
          placeholder="Ex.: 5"
        />
      </div>

      <div className={s.acoes}>
        <Botao type="submit" variante="neutro" disabled={pending}>
          {pending ? 'Concluindo…' : 'Concluir Corte'}
        </Botao>
      </div>
    </form>
  );
}
