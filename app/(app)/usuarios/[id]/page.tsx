import { notFound } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import { buscarUsuario } from '@/features/usuarios/consultas';
import { DetalheUsuarioCliente } from '@/features/usuarios/components/DetalheUsuarioCliente';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

type Props = { params: Promise<{ id: string }> };

export default async function PaginaDetalheUsuario({ params }: Props) {
  await exigirModulo('usuarios');
  const { id } = await params;
  const usuario = await buscarUsuario(id);

  if (!usuario) notFound();

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina grupo="Administração" titulo={usuario.nome} />
      <DetalheUsuarioCliente usuario={usuario} />
    </ContainerPagina>
  );
}
