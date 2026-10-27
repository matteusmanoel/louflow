'use client';

import { useSyncExternalStore } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ItemMenu } from './icones';

const CHAVE = 'louFlowGruposMenu';
const EVENTO_GRUPOS = 'louflow-grupos';

export type GrupoMenu = { grupo: string; itens: ItemMenu[] };

function lerCru(): string {
  try {
    return localStorage.getItem(CHAVE) ?? '';
  } catch {
    return '';
  }
}

function inscreverGrupos(ouvir: () => void) {
  window.addEventListener(EVENTO_GRUPOS, ouvir);
  window.addEventListener('storage', ouvir);
  return () => {
    window.removeEventListener(EVENTO_GRUPOS, ouvir);
    window.removeEventListener('storage', ouvir);
  };
}

function interpretar(cru: string): Record<string, boolean> {
  if (!cru) return {};
  try {
    const valor = JSON.parse(cru) as unknown;
    if (valor && typeof valor === 'object') return valor as Record<string, boolean>;
  } catch {}
  return {};
}

/** Grupo da rota ativa abre sempre. "Em breve" começa fechado. O resto persiste. */
export function useGruposAbertos(grupos: GrupoMenu[], caminho: string) {
  const cru = useSyncExternalStore(inscreverGrupos, lerCru, () => '');
  const salvos = interpretar(cru);

  const grupoAtivo = grupos.find(({ itens }) =>
    itens.some((item) => caminho === `/${item.slug}` || caminho.startsWith(`/${item.slug}/`)),
  )?.grupo;

  function aberto(grupo: string): boolean {
    if (grupo === grupoAtivo) return true;
    if (grupo in salvos) return salvos[grupo]!;
    return grupo !== 'Em breve';
  }

  function alternar(grupo: string) {
    if (grupo === grupoAtivo) return;
    const proximo = { ...salvos, [grupo]: !aberto(grupo) };
    try {
      localStorage.setItem(CHAVE, JSON.stringify(proximo));
    } catch {}
    window.dispatchEvent(new Event(EVENTO_GRUPOS));
  }

  return { aberto, alternar, grupoAtivo };
}

export function BotaoGrupo({
  grupo,
  aberto,
  onAlternar,
  className,
  idPrefix = 'menu',
}: {
  grupo: string;
  aberto: boolean;
  onAlternar: () => void;
  className?: string;
  idPrefix?: string;
}) {
  return (
    <button
      type="button"
      className={cn('grupo-botao', className)}
      aria-expanded={aberto}
      aria-controls={`${idPrefix}-grupo-${grupo}`}
      onClick={onAlternar}
    >
      <span>{grupo}</span>
      <ChevronRight
        className={cn('h-3.5 w-3.5 transition-transform motion-reduce:transition-none', aberto && 'rotate-90')}
        aria-hidden
      />
    </button>
  );
}
