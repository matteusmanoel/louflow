'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatarData } from '@/lib/datas';
import { confirmarRecebimento, adiarEntrega } from '../actions';
import type { PendenciaListada, AdiamentoListado } from '../consultas';

function diasAteEntrega(d: Date | null): number | null {
  if (!d) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ms = d.getTime() - hoje.getTime();
  return Math.ceil(ms / 86_400_000);
}

export function CartaoPendencia({
  pendencia,
  adiamentos,
}: {
  pendencia: PendenciaListada;
  adiamentos: AdiamentoListado[];
}) {
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<{ texto: string; ok: boolean } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [motivo, setMotivo] = useState('');

  const dias = diasAteEntrega(pendencia.dataEntrega);
  const diasLabel =
    dias === null
      ? null
      : dias < 0
      ? `${Math.abs(dias)} dia(s) em atraso`
      : dias === 0
      ? 'Entrega hoje'
      : `${dias} dia(s) restante(s)`;

  function handleConfirmar() {
    startTransition(async () => {
      const res = await confirmarRecebimento({ demandaId: pendencia.id });
      setMensagem({ texto: res.mensagem, ok: res.ok });
    });
  }

  function handleAdiar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await adiarEntrega({ demandaId: pendencia.id, novaData, motivo });
      setMensagem({ texto: res.mensagem, ok: res.ok });
      if (res.ok) setShowForm(false);
    });
  }

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-[var(--raio-card)] border p-5 text-[var(--texto-forte)] shadow-[var(--sombra-card)]',
        pendencia.prazoAtrasado
          ? 'border-[var(--alerta-atrasada)] bg-[var(--linha-atrasada-fundo)]'
          : 'border-[var(--borda-app)] bg-[var(--superficie)]'
      )}
    >
      {/* Cabeçalho */}
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h2
          className={cn(
            'm-0 text-base font-semibold',
            pendencia.prazoAtrasado
              ? 'text-[var(--linha-atrasada-texto)]'
              : 'text-[var(--texto-forte)]',
          )}
        >
          {pendencia.titulo}
        </h2>
        <span className="text-[13px] text-[var(--chip-aprovacao-texto)] bg-[var(--chip-aprovacao-fundo)] border border-[var(--chip-aprovacao-borda)] px-2.5 py-0.5 rounded-full whitespace-nowrap">
          {pendencia.status}
        </span>
      </header>

      {/* Meta */}
      <div className="flex gap-3 items-center flex-wrap text-sm">
        <span className="text-[var(--texto-suave)]">
          {pendencia.dataEntrega ? (
            <>
              Prazo:{' '}
              <time dateTime={pendencia.dataEntrega.toISOString().slice(0, 10)}>
                {formatarData(pendencia.dataEntrega)}
              </time>
            </>
          ) : (
            'Prazo não definido'
          )}
        </span>
        {diasLabel && (
          <span
            className={cn(
              pendencia.prazoAtrasado
                ? 'font-semibold text-[var(--linha-atrasada-texto)]'
                : 'font-medium text-[var(--texto-suave)]',
            )}
          >
            {diasLabel}
          </span>
        )}
      </div>

      {/* Histórico de adiamentos */}
      {adiamentos.length > 0 && (
        <details className="text-sm text-[var(--texto-suave)]">
          <summary className="cursor-pointer font-medium py-1 text-[var(--loumar-700)]">
            Histórico de adiamentos ({adiamentos.length})
          </summary>
          <ul className="list-none p-0 m-0 mt-2 flex flex-col gap-2">
            {adiamentos.map((a) => (
              <li key={a.id} className="border-l-2 border-[var(--borda-app)] pl-3">
                <time dateTime={a.criadoEm.toISOString()}>{formatarData(a.criadoEm)}</time>
                {a.usuarioNome && <span> · {a.usuarioNome}</span>}
                {a.detalhes && (
                  <p className="mt-1 text-[var(--texto-suave)] text-[13px] m-0">{a.detalhes}</p>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Feedback */}
      {mensagem && (
        <Alert variant={mensagem.ok ? 'info' : 'destructive'}>
          <AlertDescription>{mensagem.texto}</AlertDescription>
        </Alert>
      )}

      {/* Ações */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={handleConfirmar}
          disabled={isPending}
          type="button"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Confirmar recebimento
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          disabled={isPending}
          type="button"
          aria-expanded={showForm}
        >
          {showForm ? 'Fechar' : 'Solicitar adiamento'}
        </Button>
      </div>

      {/* Formulário de adiamento */}
      {showForm && (
        <form
          onSubmit={handleAdiar}
          className="flex flex-col gap-3 p-4 bg-[var(--loumar-50)] rounded-[var(--raio-input)] border border-[var(--borda-app)]"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`nova-data-${pendencia.id}`}>Nova data de entrega</Label>
            <Input
              id={`nova-data-${pendencia.id}`}
              type="date"
              required
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`motivo-${pendencia.id}`}>Motivo do adiamento</Label>
            <Input
              id={`motivo-${pendencia.id}`}
              type="text"
              required
              maxLength={500}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={isPending} className="self-start">
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Salvando…</>
            ) : (
              'Confirmar adiamento'
            )}
          </Button>
        </form>
      )}
    </article>
  );
}
