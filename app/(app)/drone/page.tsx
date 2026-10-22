import Link from 'next/link';
import { exigirModulo } from '@/lib/auth';
import { Titulo, Botao, Cartao } from '@/components/ui';
import { listarUsosDrone } from '@/features/drone/consultas';
import { TabelaDrone } from '@/features/drone/components/TabelaDrone';

export default async function PaginaDrone() {
  await exigirModulo('drone');

  const { usos, totalAtivosReais } = await listarUsosDrone();

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <Titulo sobre="Recursos">Uso de Drone</Titulo>
        <Link href="/drone/novo" style={{ textDecoration: 'none' }}>
          <Botao>+ Registrar uso</Botao>
        </Link>
      </div>

      <Cartao>
        <TabelaDrone usos={usos} totalAtivosReais={totalAtivosReais} />
      </Cartao>
    </div>
  );
}
