import { exigirModulo } from '@/lib/auth';
import { Titulo } from '@/components/ui';
import { NovoUsuarioCliente } from '@/features/usuarios/components/NovoUsuarioCliente';

export default async function PaginaNovoUsuario() {
  await exigirModulo('usuarios');

  return (
    <main>
      <Titulo sobre="Usuários">Novo usuário</Titulo>
      <NovoUsuarioCliente />
    </main>
  );
}
