import { exigirModulo } from '@/lib/auth';
import { listarReservas } from '@/features/midia-movel/consultas';
import { FormReserva } from '@/features/midia-movel/components/FormReserva';
import { ListaReservas } from '@/features/midia-movel/components/ListaReservas';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaMidiaMovel() {
  const usuario = await exigirModulo('midia-movel');
  const reservas = await listarReservas();

  return (
    <ContainerPagina>
      <CabecalhoPagina grupo="Recursos" titulo="Mídia Móvel" />
      <FormReserva />
      <section className="grid min-w-0 gap-3">
        <h2 className="text-base font-semibold text-[var(--texto-forte)]">Reservas</h2>
        <ListaReservas
          reservas={reservas}
          usuarioId={usuario.id}
          ehAdmin={usuario.perfil === 'Administrador'}
        />
      </section>
    </ContainerPagina>
  );
}
