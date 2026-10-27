'use client';

import { useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { Resultado } from '@/lib/action';
import type { Captacao } from '../consultas';
import { agendarCaptacao, editarCaptacao, cancelarCaptacao } from '../actions';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
import { mostrarFeedback } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Videomaker = { id: string; nome: string };

type Props = {
  videomakers: Videomaker[];
  captacao?: Captacao;
};

type Estado = { mensagem: string; ok?: boolean } | null;

function toInputDatetime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Asterisco() {
  return (
    <span className="text-alerta-atrasada" aria-hidden>
      *
    </span>
  );
}

export function FormularioCaptacao({ videomakers, captacao }: Props) {
  const router = useRouter();
  const edicao = !!captacao;

  const acao = async (_anterior: Estado, form: FormData): Promise<Estado> => {
    const entrada: Record<string, unknown> = {
      startsAt: new Date(form.get('startsAt') as string).toISOString(),
      endsAt: new Date(form.get('endsAt') as string).toISOString(),
      videomakerId: form.get('videomakerId'),
      influencerId: form.get('influencerId') || undefined,
      client: form.get('client') || undefined,
      subject: form.get('subject') || undefined,
      location: form.get('location') || undefined,
    };
    if (edicao) entrada.id = captacao.id;

    const resultado: Resultado<{ id: string }> = edicao
      ? await editarCaptacao(entrada)
      : await agendarCaptacao(entrada);

    mostrarFeedback(resultado);
    if (!resultado.ok) return { mensagem: resultado.mensagem };
    router.push('/captacoes');
    return { mensagem: resultado.mensagem, ok: true };
  };

  const [estado, dispatch, pendente] = useActionState(acao, null);

  return (
    <form action={dispatch} className="flex flex-col gap-4">
      {estado && !estado.ok && (
        <Alert variant="destructive">
          <AlertDescription>{estado.mensagem}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="startsAt">
            Início <Asterisco />
          </Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={captacao ? toInputDatetime(captacao.startsAt) : undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endsAt">
            Fim <Asterisco />
          </Label>
          <Input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={captacao ? toInputDatetime(captacao.endsAt) : undefined}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="videomakerId">
          Videomaker <Asterisco />
        </Label>
        <Select name="videomakerId" required defaultValue={captacao?.videomakerId ?? ''}>
          <SelectTrigger id="videomakerId">
            <SelectValue placeholder="Selecione…" />
          </SelectTrigger>
          <SelectContent>
            {videomakers.map((v) => (
              <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="client">Cliente</Label>
        <Input id="client" name="client" maxLength={200} defaultValue={captacao?.client ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="subject">Assunto</Label>
        <Input id="subject" name="subject" maxLength={200} defaultValue={captacao?.subject ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="location">Local</Label>
        <Input id="location" name="location" maxLength={200} defaultValue={captacao?.location ?? ''} />
      </div>

      <RodapeAcoes
        destrutiva={captacao ? <BotaoCancelarCaptacao id={captacao.id} /> : undefined}
        secundaria={
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Voltar
          </Button>
        }
        primaria={
          <Button type="submit" disabled={pendente}>
            {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {pendente ? 'Salvando…' : edicao ? 'Salvar alterações' : 'Agendar Captação'}
          </Button>
        }
      />
    </form>
  );
}

export function BotaoCancelarCaptacao({ id }: { id: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  function confirmar() {
    iniciar(async () => {
      const resultado = await cancelarCaptacao({ id });
      mostrarFeedback(resultado);
      if (resultado.ok) router.push('/captacoes');
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" type="button" disabled={pendente}>
          {pendente ? 'Cancelando…' : 'Cancelar captação'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar captação?</AlertDialogTitle>
          <AlertDialogDescription>
            A captação agendada será cancelada. Essa operação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: 'destructive' }))}
            onClick={confirmar}
          >
            Cancelar captação
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
