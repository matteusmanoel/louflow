'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { carregarAvisos } from '@/features/dashboard/actions';
import type { AvisoPainel } from '@/features/dashboard/avisos';

const CHAVE = 'louflow-avisos';
const INTERVALO_MS = 30_000;

type Memoria = { vistos: number[]; ocultos: number[] };

function lerMemoria(): Memoria | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const valor = JSON.parse(bruto) as Partial<Memoria>;
    return {
      vistos: Array.isArray(valor.vistos) ? valor.vistos.filter((id) => typeof id === 'number') : [],
      ocultos: Array.isArray(valor.ocultos) ? valor.ocultos.filter((id) => typeof id === 'number') : [],
    };
  } catch {
    return null;
  }
}

function guardarMemoria(memoria: Memoria) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(memoria));
  } catch {
    // Sem armazenamento local o sino continua só nesta aba.
  }
}

export function SinoAvisos() {
  const painelId = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<AvisoPainel[]>([]);
  const [vistos, setVistos] = useState<number[]>([]);
  const [ocultos, setOcultos] = useState<number[]>([]);
  const primeira = useRef(true);

  const aplicar = useCallback((lista: AvisoPainel[]) => {
    const memoria = lerMemoria() ?? { vistos: [], ocultos: [] };
    const visiveis = lista.filter((aviso) => !memoria.ocultos.includes(aviso.id));
    if (primeira.current && !lerMemoria()) {
      memoria.vistos = visiveis.map((aviso) => aviso.id);
      guardarMemoria(memoria);
    }
    primeira.current = false;
    setOcultos(memoria.ocultos);
    setVistos(memoria.vistos);
    setItens(visiveis);
  }, []);

  useEffect(() => {
    let ativo = true;
    async function buscar() {
      if (document.hidden) return;
      const resultado = await carregarAvisos({});
      if (!ativo || !resultado.ok || !resultado.dados) return;
      aplicar(resultado.dados);
    }
    void buscar();
    const id = window.setInterval(() => void buscar(), INTERVALO_MS);
    return () => {
      ativo = false;
      window.clearInterval(id);
    };
  }, [aplicar]);

  useEffect(() => {
    if (!aberto) return;
    function fora(evento: MouseEvent) {
      if (!raiz.current?.contains(evento.target as Node)) setAberto(false);
    }
    function tecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAberto(false);
    }
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  function abrir() {
    const proximo = !aberto;
    setAberto(proximo);
    if (proximo) {
      const ids = itens.map((aviso) => aviso.id);
      const memoria = { vistos: Array.from(new Set([...vistos, ...ids])), ocultos };
      setVistos(memoria.vistos);
      guardarMemoria(memoria);
    }
  }

  function limpar() {
    const ids = itens.map((aviso) => aviso.id);
    const memoria = { vistos, ocultos: Array.from(new Set([...ocultos, ...ids])) };
    setOcultos(memoria.ocultos);
    setItens([]);
    guardarMemoria(memoria);
  }

  const naoLidos = itens.filter((aviso) => !vistos.includes(aviso.id)).length;

  return (
    <div ref={raiz} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={naoLidos > 0 ? `Notificações, ${naoLidos} não lidas` : 'Notificações'}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="relative"
        onClick={abrir}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {naoLidos > 0 && (
          <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--alerta-atrasada)] px-1 text-[10px] font-bold text-[var(--superficie)]">
            {naoLidos > 99 ? '99+' : naoLidos}
          </span>
        )}
      </Button>
      {aberto && (
        <div
          id={painelId}
          role="region"
          aria-label="Notificações"
          className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-3 shadow-[var(--sombra-topo)]"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <strong className="text-sm text-[var(--texto-forte)]">Notificações</strong>
            <Button type="button" variant="ghost" size="sm" onClick={limpar}>
              Limpar
            </Button>
          </div>
          {itens.length === 0 ? (
            <p className="text-sm text-[var(--texto-suave)]">Nenhuma notificação nova.</p>
          ) : (
            <ul className="m-0 flex max-h-80 list-none flex-col gap-2 overflow-y-auto p-0">
              {itens.map((aviso) => (
                <li key={aviso.id} className="border-b border-[var(--borda-app)] pb-2 last:border-b-0">
                  <p className="truncate text-sm font-medium text-[var(--texto-forte)]" title={aviso.titulo}>
                    {aviso.titulo}
                  </p>
                  <p className="text-xs text-[var(--texto-suave)]">
                    Editor: {aviso.editor} · Status: {aviso.status}
                  </p>
                  <p className="text-xs text-[var(--texto-suave)]">{aviso.texto}</p>
                  <p className="text-xs tabular-nums text-[var(--texto-suave)]">{aviso.quando}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
