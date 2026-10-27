'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
import { criarReserva } from '../actions';

type Estado = { mensagem: string; ok: boolean } | null;

function Asterisco() {
  return (
    <span className="text-alerta-atrasada" aria-hidden>
      *
    </span>
  );
}

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
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Nova Reserva</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={acao} className="flex flex-col gap-4">
          {estado && (
            <Alert variant={estado.ok ? 'info' : 'destructive'}>
              <AlertDescription>{estado.mensagem}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="startsAt">
              Início <Asterisco />
            </Label>
            <Input id="startsAt" name="startsAt" type="datetime-local" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="endsAt">
              Fim <Asterisco />
            </Label>
            <Input id="endsAt" name="endsAt" type="datetime-local" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">
              Motivo <Asterisco />
            </Label>
            <Input
              id="reason"
              name="reason"
              type="text"
              placeholder="Descreva o uso da Mídia Móvel"
              required
            />
          </div>

          <RodapeAcoes
            secundaria={
              <Button type="reset" variant="outline" disabled={pendente}>
                Cancelar
              </Button>
            }
            primaria={
              <Button type="submit" disabled={pendente}>
                {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {pendente ? 'Reservando…' : 'Reservar'}
              </Button>
            }
          />
        </form>
      </CardContent>
    </Card>
  );
}
