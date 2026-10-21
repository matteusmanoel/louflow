import type { ReactNode } from 'react';
import { MODULOS, ORDEM_GRUPOS } from '@/lib/modules';
import type { UsuarioSessao } from '@/lib/session';
import { sair } from '@/features/acesso/actions';
import { Botao } from '@/components/ui';
import { MenuLateral, type ItemMenu } from './MenuLateral';
import { AlternarTema } from './AlternarTema';
import s from './shell.module.css';

const ROTULO_PERFIL: Record<UsuarioSessao['perfil'], string> = {
  Administrador: 'Administrador',
  Editor: 'Editor',
  Influencer: 'Influencer',
  Premios: 'Prêmios',
};

export function AppShell({ usuario, children }: { usuario: UsuarioSessao; children: ReactNode }) {
  const grupos = ORDEM_GRUPOS.map((grupo) => ({
    grupo,
    itens: MODULOS.filter((m) => m.grupo === grupo && m.permitido(usuario)).map<ItemMenu>((m) => ({ slug: m.slug, rotulo: m.rotulo })),
  })).filter((g) => g.itens.length > 0);

  return (
    <MenuLateral grupos={grupos}>
      <header className={s.topo}>
        <div className={s.usuario}>
          <span className={s.usuarioNome}>{usuario.nome}</span>
          <span className={s.usuarioPerfil}>{ROTULO_PERFIL[usuario.perfil]}</span>
        </div>
        <div className={s.acoes}>
          <AlternarTema />
          <form action={sair}>
            <Botao variante="neutro" type="submit">
              Sair
            </Botao>
          </form>
        </div>
      </header>
      <main className={s.conteudo}>{children}</main>
    </MenuLateral>
  );
}
