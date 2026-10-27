'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ICONES, ROTULO_CURTO, type ItemMenu } from './icones';
import { useNavegacao } from './navegacao-contexto';

/**
 * Atalhos do mobile. A seleção (prioridade por perfil, no máximo 4) é feita no AppShell.
 * Não renderiza com um destino ou menos.
 */
export function BottomBar({ itens, temMais }: { itens: ItemMenu[]; temMais: boolean }) {
  const caminho = usePathname();
  const { setMenuAberto } = useNavegacao();

  if (itens.length === 0) return null;

  return (
    <nav className="bottom-bar" aria-label="Navegação rápida">
      {itens.map((item) => {
        const Icone = ICONES[item.slug] ?? FileText;
        const ativo = caminho === `/${item.slug}` || caminho.startsWith(`/${item.slug}/`);
        return (
          <Link
            key={item.slug}
            href={`/${item.slug}`}
            className={cn('bottom-bar-item', ativo && 'bottom-bar-item--ativo')}
            aria-current={ativo ? 'page' : undefined}
          >
            <Icone className="h-5 w-5" aria-hidden />
            <span className="bottom-bar-rotulo">{ROTULO_CURTO[item.slug] ?? item.rotulo}</span>
          </Link>
        );
      })}
      {temMais && (
        <button type="button" className="bottom-bar-item" onClick={() => setMenuAberto(true)}>
          <MoreHorizontal className="h-5 w-5" aria-hidden />
          <span className="bottom-bar-rotulo">Mais</span>
        </button>
      )}
    </nav>
  );
}
