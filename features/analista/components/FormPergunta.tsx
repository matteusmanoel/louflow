'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { perguntarAnalista } from '../actions';

type Estado = { mensagem: string; ok: boolean } | null;

export function FormPergunta() {
  const [estado, acao, pendente] = useActionState<Estado, FormData>(async (_prev, fd) => {
    const resultado = await perguntarAnalista({ pergunta: fd.get('pergunta') });
    return { mensagem: resultado.mensagem, ok: resultado.ok };
  }, null);

  return (
    <form action={acao} className="flex flex-col gap-3">
      {estado && (
        <Alert variant={estado.ok ? 'info' : 'destructive'}>
          <AlertDescription>{estado.mensagem}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="pergunta-analista">Pergunta</Label>
        <Textarea
          id="pergunta-analista"
          name="pergunta"
          rows={4}
          maxLength={1200}
          required
          disabled={pendente}
          placeholder="Ex.: quantas demandas o editor concluiu em 2026-10?"
        />
      </div>
      <Button type="submit" disabled={pendente} className="w-full sm:w-auto">
        {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {pendente ? 'Consultando…' : 'Perguntar'}
      </Button>
    </form>
  );
}
