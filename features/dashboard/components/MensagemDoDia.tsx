'use client';

import { useState, useSyncExternalStore } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  indiceInicialMensagem,
  mensagemPorIndice,
  saudacaoMensagem,
  TOTAL_MENSAGENS,
} from '@/features/dashboard/mensagens';

const EVENTO = 'louflow-mensagem';

function lerIndice(chave: string): number | null {
  try {
    const valor = window.localStorage.getItem(chave);
    if (valor === null) return null;
    const indice = Number(valor);
    return Number.isInteger(indice) && indice >= 0 && indice < TOTAL_MENSAGENS ? indice : null;
  } catch {
    return null;
  }
}

function assinarMensagem(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener('storage', avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener('storage', avisar);
  };
}

export function MensagemDoDia({ nome, usuarioId, dia }: { nome: string; usuarioId: string; dia: string }) {
  const chave = `louflow-mensagem:${usuarioId}:${dia}`;
  const indice = useSyncExternalStore(
    assinarMensagem,
    () => lerIndice(chave) ?? indiceInicialMensagem(chave),
    () => indiceInicialMensagem(chave),
  );
  const [trocando, setTrocando] = useState(false);
  const [forcado, setForcado] = useState<number | null>(null);
  const exibido = forcado ?? indice;

  function outra() {
    let proximo = Math.floor(Math.random() * TOTAL_MENSAGENS);
    if (proximo === exibido) proximo = (proximo + 1) % TOTAL_MENSAGENS;
    setTrocando(true);
    window.setTimeout(() => {
      try {
        window.localStorage.setItem(chave, String(proximo));
        window.dispatchEvent(new Event(EVENTO));
        setForcado(null);
      } catch {
        setForcado(proximo);
      }
      setTrocando(false);
    }, 150);
  }

  return (
    <section
      aria-labelledby="mensagem-dia-titulo"
      className="flex min-w-0 flex-col gap-3 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-4 sm:flex-row sm:items-center"
    >
      <Sparkles className="h-5 w-5 flex-none text-[var(--loumar-600)]" aria-hidden />
      <div className="min-w-0 flex-1">
        <p id="mensagem-dia-titulo" className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--texto-suave)]">
          Mensagem do dia
        </p>
        <p
          className={`mt-1 text-sm text-[var(--texto-forte)] transition-opacity duration-150 ${trocando ? 'opacity-0' : 'opacity-100'}`}
          aria-live="polite"
        >
          {mensagemPorIndice(exibido)}
        </p>
        <p className="mt-1 text-xs text-[var(--texto-suave)]">{saudacaoMensagem(nome)}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={outra} disabled={trocando}>
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
        Nova mensagem
      </Button>
    </section>
  );
}
