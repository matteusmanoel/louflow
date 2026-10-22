import { exigirModulo } from '@/lib/auth';
import { Titulo, Cartao } from '@/components/ui';
import { FormularioDrone } from '@/features/drone/components/FormularioDrone';

export default async function PaginaNovoDrone() {
  await exigirModulo('drone');

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <Titulo sobre="Uso de Drone">Registrar novo uso</Titulo>
      <Cartao>
        <FormularioDrone modo="novo" />
      </Cartao>
    </div>
  );
}
