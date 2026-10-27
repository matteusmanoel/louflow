'use client';

import { useTransition, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { concluirCorte } from '../actions';
import type { Corte } from '../consultas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mostrarFeedback } from '@/lib/toast';

export function FormConcluirCorte({
  corte,
  aoSalvar,
  aoCancelar,
}: {
  corte: Corte;
  aoSalvar?: () => void;
  aoCancelar?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);

    startTransition(async () => {
      const resultado = await concluirCorte({
        id: corte.id,
        quantidadeProduzida: Number(fd.get('quantidadeProduzida')),
      });

      mostrarFeedback(resultado);
      if (resultado.ok) {
        aoSalvar?.();
      } else {
        setErro(resultado.mensagem);
      }
    });
  }

  if (corte.status === 'Concluído') return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
      aria-label={`Concluir corte ${corte.titulo}`}
    >
      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`qtd-${corte.id}`}>Quantidade Produzida *</Label>
        <Input
          id={`qtd-${corte.id}`}
          name="quantidadeProduzida"
          type="number"
          min={1}
          max={999}
          required
          placeholder="Ex.: 5"
          className="w-36"
        />
      </div>

      <RodapeAcoes
        secundaria={
          aoCancelar ? (
            <Button
              type="button"
              variant="outline"
              onClick={aoCancelar}
              disabled={pending}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
          ) : undefined
        }
        primaria={
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {pending ? 'Concluindo…' : 'Concluir Corte'}
          </Button>
        }
      />
    </form>
  );
}
