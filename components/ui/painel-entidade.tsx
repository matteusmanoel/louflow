'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AbaPainel = { id: string; rotulo: string };

type ContextoPainel = { pedirFecho: () => void };

const PainelContexto = createContext<ContextoPainel | null>(null);

/** O Cancelar do formulário passa pelo mesmo descarte do painel. */
export function useFecharPainel(): () => void {
  const ctx = useContext(PainelContexto);
  const router = useRouter();
  return ctx?.pedirFecho ?? (() => router.back());
}

type Props = {
  variante: 'pagina' | 'modal';
  titulo: string;
  grupo?: string;
  abas?: AbaPainel[];
  abaAtiva?: string;
  aoMudarAba?: (id: string) => void;
  aoFechar?: () => void;
  /** Quando informado, o fecho navega para este endereço em vez de voltar. */
  destinoFechar?: string;
  sujo?: boolean;
  acao?: ReactNode;
  rodape?: ReactNode;
  children: ReactNode;
};

/** Um gesto (Escape no painel de cima) não pode fechar o de baixo no mesmo instante. */
let fechoEmAndamento = false;

const CLASSE_MODAL = cn(
  'flex flex-col gap-0 overflow-hidden p-0',
  'max-[980px]:inset-0 max-[980px]:h-full max-[980px]:w-full max-[980px]:max-w-none',
  'max-[980px]:translate-x-0 max-[980px]:translate-y-0 max-[980px]:rounded-none',
  'min-[981px]:h-[min(90vh,920px)] min-[981px]:w-[min(1120px,92vw)] min-[981px]:max-w-none',
  '[&>button]:hidden',
);

export function PainelEntidade({
  variante,
  titulo,
  grupo,
  abas,
  abaAtiva,
  aoMudarAba,
  aoFechar,
  destinoFechar,
  sujo = false,
  acao,
  rodape,
  children,
}: Props) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const mostrarAbas = (abas?.length ?? 0) >= 2;
  const tituloId = 'painel-entidade-titulo';

  function executarFecho() {
    if (fechoEmAndamento) return;
    fechoEmAndamento = true;
    queueMicrotask(() => {
      fechoEmAndamento = false;
    });
    if (aoFechar) {
      aoFechar();
      return;
    }
    if (destinoFechar) {
      router.replace(destinoFechar);
      return;
    }
    router.back();
  }

  function pedirFecho() {
    if (sujo) {
      setConfirmar(true);
      return;
    }
    executarFecho();
  }

  function mudarAba(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('aba', id);
    const consulta = url.searchParams.toString();
    router.replace(consulta ? `${url.pathname}?${consulta}` : url.pathname, { scroll: false });
    aoMudarAba?.(id);
  }

  const miolo = (
    <PainelContexto.Provider value={{ pedirFecho }}>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--borda-app)] bg-[var(--superficie)] px-5 py-4">
          <div className="min-w-0">
            {grupo && (
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--texto-suave)]">
                {grupo}
              </p>
            )}
            {variante === 'pagina' ? (
              <h1 id={tituloId} className="text-xl font-semibold text-[var(--texto-forte)]">
                {titulo}
              </h1>
            ) : (
              <DialogTitle id={tituloId} className="text-xl font-semibold text-[var(--texto-forte)]">
                {titulo}
              </DialogTitle>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {acao}
            <Button type="button" variant="ghost" size="icon" onClick={pedirFecho} aria-label="Fechar">
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </header>

        {mostrarAbas && (
          <div
            role="tablist"
            aria-label="Seções"
            className="flex gap-1 overflow-x-auto border-b border-[var(--borda-app)] bg-[var(--superficie)] px-3"
          >
            {abas!.map((aba) => {
              const ativa = aba.id === abaAtiva;
              return (
                <button
                  key={aba.id}
                  type="button"
                  role="tab"
                  aria-selected={ativa}
                  className={cn(
                    'shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium',
                    ativa
                      ? 'border-[var(--loumar-700)] text-[var(--texto-forte)]'
                      : 'border-transparent text-[var(--texto-suave)] hover:text-[var(--texto-forte)]',
                  )}
                  onClick={() => mudarAba(aba.id)}
                >
                  {aba.rotulo}
                </button>
              );
            })}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {rodape && (
          <footer className="border-t border-[var(--borda-app)] bg-[var(--superficie)] px-5 py-3">
            {rodape}
          </footer>
        )}
      </div>

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent className="z-[60]">
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              As alterações deste formulário serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={executarFecho}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PainelContexto.Provider>
  );

  if (variante === 'modal') {
    return (
      <Dialog open onOpenChange={(aberto) => { if (!aberto) pedirFecho(); }}>
        <DialogContent
          className={CLASSE_MODAL}
          aria-labelledby={tituloId}
        >
          {miolo}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <section aria-labelledby={tituloId} className="mx-auto flex min-h-[70vh] w-full max-w-[1120px] flex-col">
      <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-[var(--raio-painel)] border border-[var(--borda-app)] bg-[var(--superficie)] shadow-[var(--sombra-painel)] max-[980px]:min-h-[calc(100dvh-8rem)]">
        {miolo}
      </div>
    </section>
  );
}
