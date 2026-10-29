'use client';

import { useActionState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';
import { mostrarFeedback } from '@/lib/toast';
import { excluirComentario } from '../actions';

type Estado = { mensagem: string; ok: boolean } | null;

export function BotaoExcluirComentario({ comentarioId }: { comentarioId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [, acao, pendente] = useActionState<Estado, FormData>(
    async (_prev: Estado, fd: FormData) => {
      const resultado = await excluirComentario({ comentarioId: fd.get('comentarioId') as string });
      mostrarFeedback(resultado);
      if (resultado.ok) router.refresh();
      return { mensagem: resultado.mensagem, ok: resultado.ok };
    },
    null,
  );

  return (
    <>
      <form ref={formRef} action={acao} className="sr-only">
        <input type="hidden" name="comentarioId" value={comentarioId} />
      </form>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pendente}
            aria-label="Excluir comentário"
            className="h-auto px-2 py-0.5 text-[11px] text-[var(--texto-suave)] hover:text-[var(--alerta-atrasada)]"
          >
            {pendente && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
            Excluir
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              O comentário será removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }))}
              disabled={pendente}
              onClick={() => formRef.current?.requestSubmit()}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
