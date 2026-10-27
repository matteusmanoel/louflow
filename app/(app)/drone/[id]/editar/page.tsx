import { notFound } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import { carregarUsoDrone } from '@/features/drone/consultas';
import { FormularioDrone } from '@/features/drone/components/FormularioDrone';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

type Props = { params: Promise<{ id: string }> };

export default async function PaginaEditarDrone({ params }: Props) {
  await exigirModulo('drone');
  const { id } = await params;

  const uso = await carregarUsoDrone(id);
  if (!uso || uso.status === 'Cancelado') notFound();

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina grupo="Recursos" titulo="Editar registro" />
      <FormularioDrone
        modo="editar"
        id={uso.id}
        versao={uso.updated_at}
        valorInicial={{
          used_on: uso.used_on,
          responsible: uso.responsible,
          served_profile: uso.served_profile,
          reason: uso.reason,
          location: uso.location,
        }}
      />
    </ContainerPagina>
  );
}
