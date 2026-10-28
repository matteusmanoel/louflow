import { exigirModulo } from '@/lib/auth';
import { carregarDashboard } from '@/features/dashboard/consultas';
import { descricaoDashboard, VisaoDashboard } from '@/features/dashboard/components/VisaoDashboard';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaDashboard() {
  const usuario = await exigirModulo('dashboard');
  const visao = await carregarDashboard(usuario);

  return (
    <ContainerPagina>
      <CabecalhoPagina grupo="Acompanhamento" titulo="Dashboard" descricao={descricaoDashboard(visao.perfil)} />
      <VisaoDashboard visao={visao} />
    </ContainerPagina>
  );
}
