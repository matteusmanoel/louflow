'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FileText, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ICONES, type ItemMenu } from './icones';
import { BotaoGrupo, useGruposAbertos, type GrupoMenu } from './grupos-nav';
import { RodapeConta } from './RodapeConta';
import { useNavegacao } from './navegacao-contexto';

/**
 * Hambúrguer + Sheet. Some quando o perfil tem um destino ou menos:
 * nesse caso o tema e o Sair ficam no topbar, porque a sidebar não existe no mobile.
 */
export function MenuMobile({
  grupos,
  nome,
  perfil,
  visivel,
}: {
  grupos: GrupoMenu[];
  nome: string;
  perfil: string;
  visivel: boolean;
}) {
  const caminho = usePathname();
  const { menuAberto, setMenuAberto } = useNavegacao();
  const { aberto, alternar } = useGruposAbertos(grupos, caminho);

  if (!visivel) return null;

  return (
    <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Abrir menu de navegação"
        className="btn-hamburguer"
        onClick={() => setMenuAberto(true)}
      >
        <Menu className="h-5 w-5" aria-hidden />
      </Button>
      <SheetContent side="left" className="menu-drawer flex w-[280px] flex-col p-0 transition-none">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="bg-gradient-to-b from-[var(--loumar-900)] to-[var(--loumar-950)] px-4 py-4 pr-12">
          <Image
            src="/logo-loumar.png"
            alt="Loumar"
            width={130}
            height={25}
            className="brightness-0 invert"
          />
          <p className="mt-3 text-sm font-semibold text-white">{nome}</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-white/70">{perfil}</p>
        </div>

        <nav className="sheet-menu-nav" aria-label="Menu principal">
          {grupos.map(({ grupo, itens }) => (
            <div key={grupo} className="sheet-grupo-nav">
              <BotaoGrupo
                grupo={grupo}
                aberto={aberto(grupo)}
                onAlternar={() => alternar(grupo)}
                className="sheet-grupo-botao"
                idPrefix="sheet"
              />
              {aberto(grupo) && (
                <div id={`sheet-grupo-${grupo}`}>
                  {itens.map((item) => {
                    const Icone = ICONES[item.slug] ?? FileText;
                    const ativo = caminho === `/${item.slug}` || caminho.startsWith(`/${item.slug}/`);
                    return (
                      <Link
                        key={item.slug}
                        href={`/${item.slug}`}
                        className={cn('sheet-item-nav', ativo && 'sheet-item-nav--ativo')}
                        aria-current={ativo ? 'page' : undefined}
                        onClick={() => setMenuAberto(false)}
                      >
                        <Icone className="h-4 w-4 flex-none" aria-hidden />
                        {item.rotulo}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
        <RodapeConta tom="claro" />
      </SheetContent>
    </Sheet>
  );
}

export type { ItemMenu };
