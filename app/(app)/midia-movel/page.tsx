import { exigirModulo } from '@/lib/auth';
import { listarReservas } from '@/features/midia-movel/consultas';
import { FormReserva } from '@/features/midia-movel/components/FormReserva';
import { ListaReservas } from '@/features/midia-movel/components/ListaReservas';
import { Titulo } from '@/components/ui';

export default async function PaginaMidiaMovel() {
  const usuario = await exigirModulo('midia-movel');
  const reservas = await listarReservas();

  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px', display: 'grid', gap: '24px' }}>
      <Titulo sobre="Recursos">Mídia Móvel</Titulo>
      <FormReserva />
      <section>
        <h2 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 800 }}>Reservas</h2>
        <ListaReservas
          reservas={reservas}
          usuarioId={usuario.id}
          ehAdmin={usuario.perfil === 'Administrador'}
        />
      </section>
    </main>
  );
}
