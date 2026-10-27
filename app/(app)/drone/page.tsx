import Link from 'next/link';
import { Plus } from 'lucide-react';
import { exigirModulo } from '@/lib/auth';
import { listarUsosDrone } from '@/features/drone/consultas';
import { TabelaDrone } from '@/features/drone/components/TabelaDrone';
import { Button } from '@/components/ui/button';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaDrone() {
  await exigirModulo('drone');
  const { usos, totalAtivosReais } = await listarUsosDrone();

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Recursos"
        titulo="Uso de Drone"
        acao={
          <Button asChild>
            <Link href="/drone/novo">
              <Plus className="h-4 w-4" aria-hidden />
              Registrar uso
            </Link>
          </Button>
        }
      />
      <TabelaDrone usos={usos} totalAtivosReais={totalAtivosReais} />
    </ContainerPagina>
  );
}
