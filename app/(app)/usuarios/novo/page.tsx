import { exigirModulo } from '@/lib/auth';
import { NovoUsuarioCliente } from '@/features/usuarios/components/NovoUsuarioCliente';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaNovoUsuario() {
  await exigirModulo('usuarios');

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina grupo="Administração" titulo="Novo usuário" />
      <NovoUsuarioCliente />
    </ContainerPagina>
  );
}
