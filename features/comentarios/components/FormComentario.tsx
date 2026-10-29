'use client';

import { useActionState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
import { Textarea } from '@/components/ui/textarea';
import { mostrarFeedback } from '@/lib/toast';
import { adicionarComentario } from '../actions';

type Estado = { mensagem: string; ok: boolean } | null;

export function FormComentario({ demandaId }: { demandaId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, acao, pendente] = useActionState<Estado, FormData>(
    async (_prev: Estado, fd: FormData) => {
      const resultado = await adicionarComentario({
        demandaId: fd.get('demandaId'),
        conteudo: fd.get('conteudo'),
      });
      if (resultado.ok) {
        formRef.current?.reset();
        mostrarFeedback(resultado);
        router.refresh();
        return null;
      }
      return { mensagem: resultado.mensagem, ok: false };
    },
    null,
  );

  return (
    <form ref={formRef} action={acao} className="flex flex-col gap-3 mt-4">
      <input type="hidden" name="demandaId" value={demandaId} />
      {estado && !estado.ok && (
        <Alert variant="destructive">
          <AlertDescription>{estado.mensagem}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="comentario-conteudo">
          Comentário <span className="text-alerta-atrasada" aria-hidden>*</span>
        </Label>
        <Textarea
          id="comentario-conteudo"
          name="conteudo"
          placeholder="Escreva um comentário…"
          rows={3}
          maxLength={2000}
          required
          disabled={pendente}
          className="min-h-[72px] resize-y"
        />
      </div>
      <RodapeAcoes
        primaria={
          <Button type="submit" size="sm" disabled={pendente} className="w-full sm:w-auto">
            {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {pendente ? 'Enviando…' : 'Comentar'}
          </Button>
        }
      />
    </form>
  );
}
