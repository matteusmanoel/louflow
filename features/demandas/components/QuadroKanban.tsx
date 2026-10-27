'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Demanda, DemandaStatus } from '../consultas';
import { COLUNAS_QUADRO, TRANSICOES } from '@/features/status/transicoes';
import { alterarStatusDemanda } from '@/features/status/actions';
import { registrarEntrega } from '@/features/aprovacoes/actions';
import { BadgePrioridade } from './BadgePrioridade';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { mostrarFeedback } from '@/lib/toast';
import { cn } from '@/lib/utils';

type Props = {
  demandas: Demanda[];
  podeMover: boolean;
  podeEntregar: boolean;
  aoAtualizar: () => void;
};

export function QuadroKanban({ demandas, podeMover, podeEntregar, aoAtualizar }: Props) {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [entrega, setEntrega] = useState<Demanda | null>(null);
  const [linkEntrega, setLinkEntrega] = useState('');
  const [obsEntrega, setObsEntrega] = useState('');
  const [cancelamento, setCancelamento] = useState<Demanda | null>(null);
  const [motivo, setMotivo] = useState('');

  function recarregar() {
    aoAtualizar();
    router.refresh();
  }

  function mover(demandaId: string, novoStatus: DemandaStatus, motivoTexto?: string) {
    startTransition(async () => {
      const resultado = await alterarStatusDemanda({
        demandaId,
        novoStatus,
        motivo: motivoTexto,
      });
      mostrarFeedback(resultado);
      if (resultado.ok) recarregar();
    });
  }

  function soltar(demanda: Demanda, destino: DemandaStatus) {
    if (destino === demanda.status) return;
    if (destino === 'Concluída') {
      mostrarFeedback({ ok: false, mensagem: 'Concluída só acontece pela aprovação da entrega.' });
      return;
    }
    if (destino === 'Aprovação') {
      if (demanda.status !== 'Em execução' || !podeEntregar) {
        mostrarFeedback({
          ok: false,
          mensagem: podeEntregar
            ? `Não é possível ir de ${demanda.status} para Aprovação.`
            : 'Você não tem permissão para registrar a entrega.',
        });
        return;
      }
      setLinkEntrega('');
      setObsEntrega('');
      setEntrega(demanda);
      return;
    }
    if (!podeMover) {
      mostrarFeedback({ ok: false, mensagem: 'Você não tem permissão para alterar o status.' });
      return;
    }
    if (!TRANSICOES[demanda.status].includes(destino)) {
      mostrarFeedback({
        ok: false,
        mensagem: `Não é possível ir de ${demanda.status} para ${destino}.`,
      });
      return;
    }
    if (destino === 'Cancelada') {
      setMotivo('');
      setCancelamento(demanda);
      return;
    }
    mover(demanda.id, destino);
  }

  function destinos(demanda: Demanda): DemandaStatus[] {
    return TRANSICOES[demanda.status].filter((status) => {
      if (status === 'Concluída') return false;
      if (status === 'Aprovação') return podeEntregar && demanda.status === 'Em execução';
      return podeMover;
    });
  }

  function acionarDestino(demanda: Demanda, destino: DemandaStatus) {
    soltar(demanda, destino);
  }

  async function confirmarEntrega() {
    if (!entrega) return;
    const resultado = await registrarEntrega({
      demandaId: entrega.id,
      arquivoUrl: linkEntrega,
      observacoes: obsEntrega || undefined,
    });
    mostrarFeedback(resultado);
    if (resultado.ok) {
      setEntrega(null);
      recarregar();
    }
  }

  return (
    <>
      <div className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto overscroll-x-contain pb-2">
        {COLUNAS_QUADRO.map((coluna) => {
          const cards = demandas.filter((d) => d.status === coluna);
          return (
            <section
              key={coluna}
              aria-label={coluna}
              className="flex w-64 shrink-0 flex-col gap-2 rounded-[var(--raio-card)] bg-[var(--loumar-50)] p-2"
              onDragOver={(evento) => {
                if (podeMover || podeEntregar) evento.preventDefault();
              }}
              onDrop={(evento) => {
                evento.preventDefault();
                const id = evento.dataTransfer.getData('text/plain');
                const demanda = demandas.find((item) => item.id === id);
                if (demanda) soltar(demanda, coluna);
              }}
            >
              <header className="flex items-center justify-between px-1 py-1">
                <h2 className="text-xs font-semibold text-[var(--texto-forte)]">{coluna}</h2>
                <span className="fonte-numero text-xs text-[var(--texto-suave)]">{cards.length}</span>
              </header>
              <div className="flex flex-col gap-2">
                {cards.map((demanda) => (
                  <article
                    key={demanda.id}
                    draggable={podeMover || podeEntregar}
                    onDragStart={(evento) => {
                      evento.dataTransfer.setData('text/plain', demanda.id);
                      evento.dataTransfer.effectAllowed = 'move';
                    }}
                    className={cn(
                      'flex flex-col gap-2 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-3 shadow-[var(--sombra-card)]',
                      (podeMover || podeEntregar) && 'cursor-grab',
                      demanda.atrasada && 'border-[var(--alerta-atrasada)]',
                    )}
                  >
                    <Link href={`/demandas/${demanda.id}`} className="text-sm font-semibold text-[var(--texto-forte)] no-underline hover:underline">
                      {demanda.title}
                    </Link>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[var(--texto-suave)]">{demanda.format}</span>
                      <BadgePrioridade prioridade={demanda.priority} />
                    </div>
                    {destinos(demanda).length > 0 && (
                      <div className="flex flex-col gap-1">
                        {destinos(demanda).map((destino) => (
                          <Button
                            key={destino}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pendente}
                            onClick={() => acionarDestino(demanda, destino)}
                          >
                            {destino === 'Aprovação' ? 'Registrar entrega' : destino}
                          </Button>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <Dialog open={entrega != null} onOpenChange={(aberto) => { if (!aberto) setEntrega(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar entrega</DialogTitle>
            <DialogDescription>
              A entrega move a demanda para Aprovação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="entrega-link">Link do arquivo</Label>
              <Input
                id="entrega-link"
                type="url"
                value={linkEntrega}
                onChange={(evento) => setLinkEntrega(evento.target.value)}
                placeholder="https://"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entrega-obs">Observação</Label>
              <Textarea
                id="entrega-obs"
                value={obsEntrega}
                onChange={(evento) => setObsEntrega(evento.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEntrega(null)}>
              Voltar
            </Button>
            <Button
              type="button"
              disabled={pendente || !linkEntrega}
              onClick={() => {
                startTransition(() => { void confirmarEntrega(); });
              }}
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelamento != null} onOpenChange={(aberto) => { if (!aberto) setCancelamento(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar demanda?</AlertDialogTitle>
            <AlertDialogDescription>Informe o motivo. A demanda passa para Cancelada.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-cancelamento">Motivo</Label>
            <Textarea
              id="motivo-cancelamento"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              rows={3}
              required
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <Button
              type="button"
              disabled={pendente || !motivo.trim()}
              onClick={() => {
                if (!cancelamento) return;
                const id = cancelamento.id;
                const texto = motivo.trim();
                setCancelamento(null);
                mover(id, 'Cancelada', texto);
              }}
            >
              Cancelar demanda
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
