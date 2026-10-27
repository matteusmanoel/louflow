'use client';

import Link from 'next/link';
import { LogOut, Settings } from 'lucide-react';
import { sair } from '@/features/acesso/actions';
import { AlternarTema } from './AlternarTema';

/** Tema, Preferências e Sair. `tom` acompanha o fundo: escuro na sidebar, claro no Sheet. */
export function RodapeConta({ tom }: { tom: 'escuro' | 'claro' }) {
  const claro = tom === 'claro';
  return (
    <div className={claro ? 'rodape-conta rodape-conta--claro' : 'rodape-menu'}>
      <AlternarTema tom={tom} />
      <Link href="/preferencias" className={claro ? 'sheet-item-nav' : 'item-nav'}>
        <Settings className="h-4 w-4 flex-none" aria-hidden />
        <span className={claro ? undefined : 'item-rotulo'}>Preferências</span>
      </Link>
      <form action={sair}>
        <button type="submit" className={claro ? 'sheet-item-nav w-full text-left' : 'item-nav w-full'}>
          <LogOut className="h-4 w-4 flex-none" aria-hidden />
          <span className={claro ? undefined : 'item-rotulo'}>Sair</span>
        </button>
      </form>
    </div>
  );
}
