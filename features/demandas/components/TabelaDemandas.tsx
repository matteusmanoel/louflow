'use client';

import { useState, useTransition, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Demanda, DemandaPrioridade, DemandaStatus } from '../consultas';
import { destinosStatus, TRANSICOES } from '@/features/status/transicoes';
import { alterarStatusDemanda } from '@/features/status/actions';
import { registrarEntrega } from '@/features/aprovacoes/actions';
import { alterarPrioridadeDemanda } from '../actions';
import { BadgePrioridade } from './BadgePrioridade';
import { BadgeStatus } from './BadgeStatus';
import { TabelaWrapper, Td, Th } from '@/components/ui/tabela';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { formatarData } from '@/lib/datas';
import { cn } from '@/lib/utils';

const PRIORIDADES: readonly DemandaPrioridade[] = ['Baixa', 'Normal', 'Alta', 'Urgente'];

type Props = {
  demandas: Demanda[];
  podeMover: boolean;
  podeEntregar: boolean;
  podePrioridade: boolean;
  aoAtualizar: () => void;
};

function parar(evento: SyntheticEvent) {
  evento.stopPropagation();
}

export function TabelaDemandas({
  demandas,
  podeMover,
  podeEntregar,
  podePrioridade,
  aoAtualizar,
}: Props) {
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

  function aplicarStatus(demanda: Demanda, destino: DemandaStatus) {
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

  function aplicarPrioridade(demanda: Demanda, prioridade: DemandaPrioridade) {
    if (prioridade === demanda.priority) return;
    startTransition(async () => {
      const resultado = await alterarPrioridadeDemanda({ id: demanda.id, priority: prioridade });
      mostrarFeedback(resultado);
      if (resultado.ok) recarregar();
    });
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
      <TabelaWrapper>
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr>
              <Th>Título</Th>
              <Th>Status</Th>
              <Th>Prioridade</Th>
              <Th>Formato</Th>
              <Th>Editor</Th>
              <Th>Influencer</Th>
              <Th>Prazo</Th>
            </tr>
          </thead>
          <tbody>
            {demandas.map((demanda) => {
              const destinos = destinosStatus(demanda.status, { podeMover, podeEntregar });
              const editor = demanda.editor_label ?? demanda.editor_nome;
              return (
                <tr
                  key={demanda.id}
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-[var(--tabela-linha-hover)]',
                    demanda.atrasada && 'bg-[var(--linha-atrasada-fundo)]',
                  )}
                  onClick={(evento) => {
                    const alvo = evento.target as HTMLElement;
                    if (alvo.closest('a, button, [role="combobox"]')) return;
                    router.push(`/demandas/${demanda.id}`);
                  }}
                >
                  <Td>
                    <Link
                      href={`/demandas/${demanda.id}`}
                      prefetch={false}
                      className={cn(
                        'font-semibold no-underline',
                        demanda.atrasada ? 'text-[var(--alerta-atrasada)]' : 'text-[var(--texto-forte)]',
                      )}
                      onClick={(evento) => evento.stopPropagation()}
                    >
                      {demanda.title}
                    </Link>
                  </Td>
                  <Td onClick={parar} onKeyDown={parar}>
                    {destinos.length === 0 ? (
                      <BadgeStatus status={demanda.status} />
                    ) : (
                      <Select
                        value={demanda.status}
                        disabled={pendente}
                        onValueChange={(valor) => aplicarStatus(demanda, valor as DemandaStatus)}
                      >
                        <SelectTrigger
                          aria-label={`Alterar status de ${demanda.title}`}
                          className="h-9 w-[11.5rem]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={demanda.status}>{demanda.status}</SelectItem>
                          {destinos.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </Td>
                  <Td onClick={parar} onKeyDown={parar}>
                    {podePrioridade ? (
                      <Select
                        value={demanda.priority}
                        disabled={pendente}
                        onValueChange={(valor) => aplicarPrioridade(demanda, valor as DemandaPrioridade)}
                      >
                        <SelectTrigger
                          aria-label={`Alterar prioridade de ${demanda.title}`}
                          className="h-9 w-[8.5rem]"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORIDADES.map((prioridade) => (
                            <SelectItem key={prioridade} value={prioridade}>
                              {prioridade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <BadgePrioridade prioridade={demanda.priority} />
                    )}
                  </Td>
                  <Td className="text-[var(--texto-suave)]">{demanda.format}</Td>
                  <Td>
                    {editor ? (
                      editor
                    ) : (
                      <span className="text-[var(--alerta-hoje)]">A definir</span>
                    )}
                  </Td>
                  <Td>{demanda.influencer_nome ?? '—'}</Td>
                  <Td
                    className={cn(
                      'tabular-nums',
                      demanda.atrasada && 'font-semibold text-[var(--alerta-atrasada)]',
                    )}
                  >
                    {formatarData(demanda.prazo_efetivo)}
                    {demanda.atrasada && demanda.prazo_efetivo ? ' · Atrasada' : ''}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TabelaWrapper>

      <Dialog open={entrega != null} onOpenChange={(aberto) => { if (!aberto) setEntrega(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar entrega</DialogTitle>
            <DialogDescription>A entrega move a demanda para Aprovação.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="entrega-link-lista">Link do arquivo</Label>
              <Input
                id="entrega-link-lista"
                type="url"
                value={linkEntrega}
                onChange={(evento) => setLinkEntrega(evento.target.value)}
                placeholder="https://"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entrega-obs-lista">Observação</Label>
              <Textarea
                id="entrega-obs-lista"
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
            <Label htmlFor="motivo-cancelamento-lista">Motivo</Label>
            <Textarea
              id="motivo-cancelamento-lista"
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
