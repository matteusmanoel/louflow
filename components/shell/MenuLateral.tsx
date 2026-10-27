'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { PanelLeftClose, PanelLeftOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ICONES, type ItemMenu } from './icones';
import { BotaoGrupo, useGruposAbertos, type GrupoMenu } from './grupos-nav';
import { RodapeConta } from './RodapeConta';
import { NavegacaoContexto } from './navegacao-contexto';
import './shell.module.css';

export type { ItemMenu };

const EVENTO_MENU = 'louflow-menu';

function alternarRecolhido() {
  const raiz = document.documentElement;
  const recolher = raiz.dataset.menu !== 'recolhido';
  if (recolher) raiz.dataset.menu = 'recolhido';
  else delete raiz.dataset.menu;
  try {
    localStorage.setItem('louFlowMenuRecolhido', recolher ? '1' : '0');
  } catch {}
  window.dispatchEvent(new Event(EVENTO_MENU));
}

function inscreverMenu(ouvir: () => void) {
  window.addEventListener(EVENTO_MENU, ouvir);
  return () => window.removeEventListener(EVENTO_MENU, ouvir);
}

function menuRecolhido() {
  return document.documentElement.dataset.menu === 'recolhido';
}

export function MenuLateral({
  grupos,
  children,
}: {
  grupos: GrupoMenu[];
  children: ReactNode;
}) {
  const caminho = usePathname();
  const recolhido = useSyncExternalStore(inscreverMenu, menuRecolhido, () => false);
  const [menuAberto, setMenuAberto] = useState(false);
  const { aberto, alternar } = useGruposAbertos(grupos, caminho);

  function toggle() {
    alternarRecolhido();
  }

  return (
    <NavegacaoContexto.Provider value={{ menuAberto, setMenuAberto }}>
      <TooltipProvider delayDuration={200}>
        <div className="grade-shell">
          <nav className="menu-lateral" aria-label="Menu principal">
            <div className="marca-shell">
              <Image
                className="logo-shell"
                src="/logo-loumar.png"
                alt="Loumar"
                width={140}
                height={27}
                priority
              />
              <button
                type="button"
                className="btn-recolher"
                onClick={toggle}
                aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
              >
                {recolhido ? (
                  <PanelLeftOpen className="h-4 w-4" aria-hidden />
                ) : (
                  <PanelLeftClose className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>

            <div className="nav-grupos">
              {grupos.map(({ grupo, itens }) => (
                <GrupoNav
                  key={grupo}
                  titulo={grupo}
                  itens={itens}
                  caminho={caminho}
                  aberto={recolhido || aberto(grupo)}
                  recolhido={recolhido}
                  onAlternar={() => alternar(grupo)}
                />
              ))}
            </div>

            <RodapeConta tom="escuro" />
          </nav>
          {children}
        </div>
      </TooltipProvider>
    </NavegacaoContexto.Provider>
  );
}

function GrupoNav({
  titulo,
  itens,
  caminho,
  aberto,
  recolhido,
  onAlternar,
}: {
  titulo: string;
  itens: ItemMenu[];
  caminho: string;
  aberto: boolean;
  recolhido: boolean;
  onAlternar: () => void;
}) {
  return (
    <div className="grupo-nav">
      {recolhido ? (
        <span className="grupo-titulo" aria-hidden>{titulo}</span>
      ) : (
        <BotaoGrupo grupo={titulo} aberto={aberto} onAlternar={onAlternar} />
      )}
              <div id={`menu-grupo-${titulo}`} className="grupo-itens" hidden={!aberto && !recolhido}>
        {itens.map((item) => {
          const ativo = caminho === `/${item.slug}` || caminho.startsWith(`/${item.slug}/`);
          const Icone = ICONES[item.slug] ?? FileText;
          return (
            <Tooltip key={item.slug}>
              <TooltipTrigger asChild>
                <Link
                  href={`/${item.slug}`}
                  className={cn('item-nav', ativo && 'item-nav--ativo')}
                  aria-current={ativo ? 'page' : undefined}
                >
                  <Icone className="h-4 w-4 flex-none" aria-hidden />
                  <span className="item-rotulo">{item.rotulo}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="menu-tooltip">
                {item.rotulo}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
