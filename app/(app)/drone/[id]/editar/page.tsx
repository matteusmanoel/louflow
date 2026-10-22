import { notFound } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import { Titulo, Cartao } from '@/components/ui';
import { carregarUsoDrone } from '@/features/drone/consultas';
import { FormularioDrone } from '@/features/drone/components/FormularioDrone';

type Props = { params: Promise<{ id: string }> };

export default async function PaginaEditarDrone({ params }: Props) {
  await exigirModulo('drone');
  const { id } = await params;

  const uso = await carregarUsoDrone(id);
  if (!uso || uso.status === 'Cancelado') notFound();

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <Titulo sobre="Uso de Drone">Editar registro</Titulo>
      <Cartao>
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
      </Cartao>
    </div>
  );
}
