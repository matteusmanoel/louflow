import type { ReactNode } from 'react';
import { MODULOS, ORDEM_GRUPOS } from '@/lib/modules';
import type { UsuarioSessao } from '@/lib/session';
import { MenuLateral, type ItemMenu } from './MenuLateral';
import { MenuMobile } from './MenuMobile';
import { BottomBar } from './BottomBar';
import { AlternarTema } from './AlternarTema';
import { PRIORIDADE_BARRA } from './icones';
import { sair } from '@/features/acesso/actions';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const ROTULO_PERFIL: Record<UsuarioSessao['perfil'], string> = {
  Administrador: 'Admin',
  Editor: 'Editor',
  Influencer: 'Influencer',
  Premios: 'Prêmios',
};

export function AppShell({ usuario, children }: { usuario: UsuarioSessao; children: ReactNode }) {
  const permitidos = MODULOS.filter((m) => m.permitido(usuario));
  const navegaveis = permitidos.filter((m) => m.slug !== 'preferencias' && !m.reservado);
  const reservados = permitidos.filter((m) => m.reservado);

  const grupos: { grupo: string; itens: ItemMenu[] }[] = ORDEM_GRUPOS.map((grupo) => ({
    grupo,
    itens: navegaveis.filter((m) => m.grupo === grupo).map<ItemMenu>((m) => ({
      slug: m.slug,
      rotulo: m.rotulo,
    })),
  })).filter((g) => g.itens.length > 0);

  if (reservados.length > 0) {
    grupos.push({
      grupo: 'Em breve',
      itens: reservados.map((m) => ({ slug: m.slug, rotulo: m.rotulo })),
    });
  }

  const porSlug = new Map(navegaveis.map((m) => [m.slug, m]));
  const prioritarios = PRIORIDADE_BARRA.flatMap((slug) => {
    const modulo = porSlug.get(slug);
    return modulo ? [{ slug: modulo.slug, rotulo: modulo.rotulo }] : [];
  });
  const resto = navegaveis
    .filter((m) => !PRIORIDADE_BARRA.includes(m.slug as (typeof PRIORIDADE_BARRA)[number]))
    .map((m) => ({ slug: m.slug, rotulo: m.rotulo }));
  const ordenados = [...prioritarios, ...resto];
  const itensRapidos = ordenados.slice(0, 4);
  const temMais = ordenados.length > 4;

  // Um destino só (Prêmios) não ganha barra nem hambúrguer. Tema e Sair ficam no topo no mobile.
  const mostrarMenu = permitidos.length > 1;
  const perfil = ROTULO_PERFIL[usuario.perfil];

  return (
    <MenuLateral grupos={grupos}>
      <header className="topo-shell">
        <MenuMobile grupos={grupos} nome={usuario.nome} perfil={perfil} visivel={mostrarMenu} />

        <div className="usuario-info">
          <span className="usuario-nome">{usuario.nome}</span>
          <span className="usuario-perfil">{perfil}</span>
        </div>

        {!mostrarMenu && (
          <div className="acoes-topo acoes-topo--mobile">
            <AlternarTema />
            <form action={sair}>
              <Button variant="ghost" size="icon" type="submit" aria-label="Sair do sistema">
                <LogOut className="h-4 w-4" aria-hidden />
              </Button>
            </form>
          </div>
        )}
      </header>

      <main className="conteudo-shell">{children}</main>

      {mostrarMenu && <BottomBar itens={itensRapidos} temMais={temMais} />}
    </MenuLateral>
  );
}
