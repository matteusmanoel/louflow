'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export type ItemAcao = {
  rotulo: string;
  href?: string;
  onSelect?: () => void;
  destrutivo?: boolean;
  /** Quando presente, a ação abre um AlertDialog antes de executar onSelect. */
  confirmacao?: { titulo: string; descricao: string; confirmar: string };
};

/**
 * Menu de ações da linha. Só recebe itens que a página já autorizou.
 * O item destrutivo fica por último e, com `confirmacao`, não executa direto.
 */
export function AcoesLinha({ rotulo, itens }: { rotulo: string; itens: ItemAcao[] }) {
  const [pendente, setPendente] = useState<ItemAcao | null>(null);
  if (itens.length === 0) return null;

  const normais = itens.filter((i) => !i.destrutivo);
  const destrutivos = itens.filter((i) => i.destrutivo);

  function acionar(item: ItemAcao) {
    if (item.confirmacao) {
      setPendente(item);
      return;
    }
    item.onSelect?.();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Ações de ${rotulo}`} className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {normais.map((item) => (
            <ItemMenu key={item.rotulo} item={item} onAcao={acionar} />
          ))}
          {destrutivos.length > 0 && normais.length > 0 && <DropdownMenuSeparator />}
          {destrutivos.map((item) => (
            <ItemMenu key={item.rotulo} item={item} onAcao={acionar} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={pendente != null} onOpenChange={(aberto) => !aberto && setPendente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendente?.confirmacao?.titulo}</AlertDialogTitle>
            <AlertDialogDescription>{pendente?.confirmacao?.descricao}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }))}
              onClick={() => {
                pendente?.onSelect?.();
                setPendente(null);
              }}
            >
              {pendente?.confirmacao?.confirmar ?? 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ItemMenu({ item, onAcao }: { item: ItemAcao; onAcao: (item: ItemAcao) => void }) {
  const classe = item.destrutivo ? 'text-[var(--destructive)] focus:text-[var(--destructive)]' : undefined;
  if (item.href && !item.confirmacao) {
    return (
      <DropdownMenuItem asChild className={classe}>
        <Link href={item.href}>{item.rotulo}</Link>
      </DropdownMenuItem>
    );
  }
  return (
    <DropdownMenuItem
      className={classe}
      onSelect={(evento) => {
        if (item.confirmacao) evento.preventDefault();
        onAcao(item);
      }}
    >
      {item.rotulo}
    </DropdownMenuItem>
  );
}
