'use client';

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { carregarAvisos } from '@/features/dashboard/actions';
import type { AvisoPainel } from '@/features/dashboard/avisos';

const CHAVE = 'louflow-avisos';
const CHAVE_SOM = 'louflow-avisos-som';
const INTERVALO_MS = 30_000;

function somMudo(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_SOM) === 'mudo';
  } catch {
    return false;
  }
}

const ouvintesSom = new Set<() => void>();

function guardarSom(mudo: boolean) {
  try {
    window.localStorage.setItem(CHAVE_SOM, mudo ? 'mudo' : 'ligado');
  } catch {
    // Sem armazenamento local o silêncio vale só nesta aba.
  }
  for (const ouvinte of ouvintesSom) ouvinte();
}

function assinarSom(ouvinte: () => void) {
  ouvintesSom.add(ouvinte);
  return () => ouvintesSom.delete(ouvinte);
}

let audioCtx: AudioContext | null = null;

function contextoAudio(): AudioContext | null {
  const Ctx = window.AudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

function emitirAviso(ctx: AudioContext) {
  const agora = ctx.currentTime;
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, agora);
  osc.frequency.exponentialRampToValueAtTime(660, agora + 0.18);
  ganho.gain.setValueAtTime(0.0001, agora);
  ganho.gain.exponentialRampToValueAtTime(0.08, agora + 0.02);
  ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 0.2);
  osc.connect(ganho);
  ganho.connect(ctx.destination);
  osc.start(agora);
  osc.stop(agora + 0.21);
}

function tocarAviso() {
  if (somMudo()) return;
  const ctx = contextoAudio();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().then(() => emitirAviso(ctx)).catch(() => undefined);
    return;
  }
  try {
    emitirAviso(ctx);
  } catch {
    // O navegador pode recusar o áudio antes do primeiro gesto.
  }
}

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
  const mudo = useSyncExternalStore(assinarSom, somMudo, () => false);
  const primeira = useRef(true);

  const aplicar = useCallback((lista: AvisoPainel[]) => {
    const memoria = lerMemoria() ?? { vistos: [], ocultos: [] };
    const visiveis = lista.filter((aviso) => !memoria.ocultos.includes(aviso.id));
    const primeiraCarga = primeira.current;
    if (primeiraCarga && !lerMemoria()) {
      memoria.vistos = visiveis.map((aviso) => aviso.id);
      guardarMemoria(memoria);
    }
    const novos = visiveis.filter((aviso) => !memoria.vistos.includes(aviso.id));
    if (!primeiraCarga && novos.length > 0) tocarAviso();
    primeira.current = false;
    setOcultos(memoria.ocultos);
    setVistos(memoria.vistos);
    setItens(visiveis);
  }, []);

  useEffect(() => {
    function destravar() {
      const ctx = contextoAudio();
      if (ctx) void ctx.resume().catch(() => undefined);
    }
    document.addEventListener('pointerdown', destravar, { once: true });
    return () => document.removeEventListener('pointerdown', destravar);
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
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={mudo}
                aria-label={mudo ? 'Ativar som das notificações' : 'Silenciar notificações'}
                onClick={() => guardarSom(!mudo)}
              >
                {mudo ? <BellOff className="h-3.5 w-3.5" aria-hidden /> : <Bell className="h-3.5 w-3.5" aria-hidden />}
                {mudo ? 'Som' : 'Silenciar'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={limpar}>
                Limpar
              </Button>
            </div>
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
