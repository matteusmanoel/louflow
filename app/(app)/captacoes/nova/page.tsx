import { redirect } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import { listarVideomakersDb } from '@/features/captacoes/consultas';
import { FormularioCaptacao } from '@/features/captacoes/components/FormularioCaptacao';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaNovaCaptatacao() {
  const usuario = await exigirModulo('captacoes');
  if (!usuario.permissoes.gerenciarCaptacoes) redirect('/captacoes');

  const videomakers = await listarVideomakersDb();

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina grupo="Recursos" titulo="Nova Captação" />
      <FormularioCaptacao videomakers={videomakers} />
    </ContainerPagina>
  );
}
