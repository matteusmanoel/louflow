'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import s from './shell.module.css';

export type ItemMenu = { slug: string; rotulo: string };

/** Estado recolhido fica em `data-menu` no <html> (aplicado antes da pintura pelo layout raiz). */
function alternarRecolhido() {
  const raiz = document.documentElement;
  const recolher = raiz.dataset.menu !== 'recolhido';
  if (recolher) raiz.dataset.menu = 'recolhido';
  else delete raiz.dataset.menu;
  try {
    localStorage.setItem('louFlowMenuRecolhido', recolher ? '1' : '0');
  } catch {}
}

function sigla(rotulo: string) {
  const palavras = rotulo.split(/\s+/).filter((p) => p.length > 2);
  const letras = palavras.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
  return letras || rotulo.slice(0, 2).toUpperCase();
}

export function MenuLateral({ grupos, children }: { grupos: { grupo: string; itens: ItemMenu[] }[]; children: ReactNode }) {
  const caminho = usePathname();

  return (
    <div className={s.grade}>
      <nav className={s.menu} aria-label="Menu principal">
        <div className={s.marca}>
          <Image className={s.logo} src="/logo-loumar.png" alt="Loumar" width={150} height={29} priority />
          <button type="button" className={s.recolher} onClick={alternarRecolhido} aria-label="Recolher ou expandir menu">
            ≡
          </button>
        </div>
        {grupos.map(({ grupo, itens }) => (
          <div key={grupo} className={s.grupo}>
            <div className={s.grupoTitulo}>{grupo}</div>
            {itens.map((item) => {
              const ativo = caminho === `/${item.slug}` || caminho.startsWith(`/${item.slug}/`);
              return (
                <Link key={item.slug} href={`/${item.slug}`} className={s.item} aria-current={ativo ? 'page' : undefined} title={item.rotulo}>
                  <span className={s.sigla} aria-hidden>
                    {sigla(item.rotulo)}
                  </span>
                  <span className={s.rotuloItem}>{item.rotulo}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {children}
    </div>
  );
}
