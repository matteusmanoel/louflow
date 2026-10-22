import { notFound } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import { Titulo } from '@/components/ui';
import { buscarUsuario } from '@/features/usuarios/consultas';
import { DetalheUsuarioCliente } from '@/features/usuarios/components/DetalheUsuarioCliente';

type Props = { params: Promise<{ id: string }> };

export default async function PaginaDetalheUsuario({ params }: Props) {
  await exigirModulo('usuarios');
  const { id } = await params;
  const usuario = await buscarUsuario(id);

  if (!usuario) notFound();

  return (
    <main>
      <Titulo sobre="Usuários">{usuario.nome}</Titulo>
      <DetalheUsuarioCliente usuario={usuario} />
    </main>
  );
}
