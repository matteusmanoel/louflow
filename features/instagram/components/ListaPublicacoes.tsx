'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { cancelarPublicacaoInstagram, reiniciarPublicacaoInstagram } from '../actions';
import type { PublicacaoVisao } from '../consultas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TabelaWrapper, Td, Th } from '@/components/ui/tabela';
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
import { mostrarFeedback } from '@/lib/toast';

const ROTULO_FORMATO: Record<string, string> = { imagem: 'Foto', reel: 'Reel', story: 'Story' };

function variante(status: string, tentativas: number) {
  if (status === 'Publicada') return 'situacao-ativo' as const;
  if (status === 'Cancelada') return 'situacao-inativo' as const;
  if (tentativas >= 5) return 'destructive' as const;
  return 'situacao-pendente' as const;
}

function rotulo(status: string, tentativas: number) {
  if (status === 'Agendada' && tentativas >= 5) return 'Não publicada';
  return status;
}

function Cancelar({ id }: { id: string }) {
  const router = useRouter();
  const [estado, dispatch, pendente] = useActionState(async () => {
    const resultado = await cancelarPublicacaoInstagram({ id });
    mostrarFeedback(resultado);
    if (resultado.ok) router.refresh();
    return resultado;
  }, null);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Cancelar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar esta publicação?</AlertDialogTitle>
          <AlertDialogDescription>Ela deixa de sair no horário marcado.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction onClick={() => dispatch()} disabled={pendente || estado?.ok === true}>
            {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Cancelar publicação
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Reiniciar({ id }: { id: string }) {
  const router = useRouter();
  const [, dispatch, pendente] = useActionState(async () => {
    const resultado = await reiniciarPublicacaoInstagram({ id });
    mostrarFeedback(resultado);
    if (resultado.ok) router.refresh();
    return resultado;
  }, null);

  return (
    <form action={dispatch}>
      <Button type="submit" variant="outline" size="sm" disabled={pendente}>
        {pendente ? 'Reabrindo…' : 'Tentar de novo'}
      </Button>
    </form>
  );
}

export function ListaPublicacoes({ itens }: { itens: PublicacaoVisao[] }) {
  if (itens.length === 0) return null;

  return (
    <TabelaWrapper>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr>
            <Th>Quando</Th>
            <Th>Publicação</Th>
            <Th>Conta</Th>
            <Th>Situação</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id}>
              <Td className="whitespace-nowrap">{item.quandoTexto}</Td>
              <Td>
                <p className="font-medium">{item.titulo}</p>
                <p className="text-xs text-[var(--texto-suave)]">{item.formato ? ROTULO_FORMATO[item.formato] ?? item.formato : ''}</p>
                {item.erro && <p className="text-xs text-[var(--alerta-atrasada)]">{item.erro}</p>}
              </Td>
              <Td>{item.username ? `@${item.username}` : '—'}</Td>
              <Td>
                <Badge variant={variante(item.status, item.tentativas)}>{rotulo(item.status, item.tentativas)}</Badge>
              </Td>
              <Td className="text-right">
                {item.status === 'Agendada' && (
                  <div className="flex justify-end gap-2">
                    {(item.tentativas > 0 || item.erro) && <Reiniciar id={item.id} />}
                    <Cancelar id={item.id} />
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </TabelaWrapper>
  );
}
