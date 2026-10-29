'use client';

import { useActionState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cadastrarSorteio } from '../actions';

type Estado = { mensagem: string; ok: boolean } | null;

export function FormularioSorteio() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [estado, acao, pendente] = useActionState<Estado, FormData>(async (_prev, fd) => {
    const resultado = await cadastrarSorteio({
      ganhador: fd.get('ganhador'),
      mes: fd.get('mes'),
      campanha: fd.get('campanha') ?? '',
      premio: fd.get('premio'),
      prazoRetirada: fd.get('prazoRetirada') ?? '',
      observacoes: fd.get('observacoes') ?? '',
      retirou: fd.get('retirou') === 'on',
    });
    if (resultado.ok) {
      formRef.current?.reset();
      router.refresh();
    }
    return { mensagem: resultado.mensagem, ok: resultado.ok };
  }, null);

  return (
    <form ref={formRef} action={acao} className="grid gap-3 sm:grid-cols-2">
      {estado && (
        <Alert variant={estado.ok ? 'info' : 'destructive'} className="sm:col-span-2">
          <AlertDescription>{estado.mensagem}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="sorteio-ganhador">Ganhador</Label>
        <Input id="sorteio-ganhador" name="ganhador" required maxLength={120} disabled={pendente} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sorteio-mes">Mês</Label>
        <Input id="sorteio-mes" name="mes" type="month" required disabled={pendente} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sorteio-campanha">Campanha ou programa</Label>
        <Input id="sorteio-campanha" name="campanha" maxLength={120} disabled={pendente} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sorteio-premio">Prêmio</Label>
        <Input id="sorteio-premio" name="premio" required maxLength={200} disabled={pendente} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sorteio-prazo">Prazo de retirada</Label>
        <Input id="sorteio-prazo" name="prazoRetirada" type="date" disabled={pendente} />
      </div>
      <label className="flex items-end gap-2 pb-2 text-sm text-[var(--texto-forte)]">
        <input type="checkbox" name="retirou" disabled={pendente} className="size-4" />
        Já retirou
      </label>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="sorteio-obs">Observações</Label>
        <Textarea id="sorteio-obs" name="observacoes" maxLength={1000} rows={3} disabled={pendente} />
      </div>
      <div>
        <Button type="submit" disabled={pendente}>
          {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {pendente ? 'Salvando…' : 'Cadastrar'}
        </Button>
      </div>
    </form>
  );
}
