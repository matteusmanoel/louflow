import Link from 'next/link';
import { exigirModulo } from '@/lib/auth';
import { Botao, Titulo } from '@/components/ui';
import { listarUsuarios } from '@/features/usuarios/consultas';
import { TabelaUsuarios } from '@/features/usuarios/components/TabelaUsuarios';

export default async function PaginaUsuarios() {
  await exigirModulo('usuarios');
  const usuarios = await listarUsuarios();

  return (
    <main>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Titulo sobre="Administração">Usuários</Titulo>
        <Link href="/usuarios/novo">
          <Botao variante="principal">Novo usuário</Botao>
        </Link>
      </header>

      <TabelaUsuarios usuarios={usuarios} />
    </main>
  );
}
