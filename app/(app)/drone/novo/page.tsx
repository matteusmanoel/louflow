import { exigirModulo } from '@/lib/auth';
import { FormularioDrone } from '@/features/drone/components/FormularioDrone';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaNovoDrone() {
  await exigirModulo('drone');

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina grupo="Recursos" titulo="Registrar novo uso" />
      <FormularioDrone modo="novo" />
    </ContainerPagina>
  );
}
