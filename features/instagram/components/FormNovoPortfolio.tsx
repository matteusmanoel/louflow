'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { criarPortfolioInstagram } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mostrarFeedback } from '@/lib/toast';
import type { Resultado } from '@/lib/action';

export function FormNovoPortfolio() {
  const router = useRouter();
  const [estado, dispatch, pendente] = useActionState(
    async (_prev: Resultado<{ id: string }> | null, form: FormData) => {
      const resultado = await criarPortfolioInstagram({ rotulo: form.get('rotulo') });
      mostrarFeedback(resultado);
      if (resultado.ok) router.refresh();
      return resultado;
    },
    null,
  );

  return (
    <form action={dispatch} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor="rotulo">Novo Business Manager</Label>
        <Input id="rotulo" name="rotulo" required minLength={2} maxLength={80} placeholder="Nome que a equipe reconhece" />
      </div>
      <Button type="submit" disabled={pendente} className="w-full sm:w-auto">
        {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {pendente ? 'Salvando…' : 'Cadastrar'}
      </Button>
      {estado && !estado.ok && (
        <Alert variant="destructive" className="sm:basis-full">
          <AlertDescription>{estado.mensagem}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
