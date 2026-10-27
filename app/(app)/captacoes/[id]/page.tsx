import { notFound, redirect } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import { obterCaptacaoDb, listarVideomakersDb } from '@/features/captacoes/consultas';
import { FormularioCaptacao } from '@/features/captacoes/components/FormularioCaptacao';
import { BadgeStatusCaptacao } from '@/features/captacoes/components/BadgeStatusCaptacao';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaCaptacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirModulo('captacoes');
  if (!usuario.permissoes.gerenciarCaptacoes) redirect('/captacoes');

  const [captacao, videomakers] = await Promise.all([obterCaptacaoDb(id), listarVideomakersDb()]);
  if (!captacao) notFound();

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina
        grupo="Recursos"
        titulo="Editar Captação"
        extra={<BadgeStatusCaptacao status={captacao.status} />}
      />
      {captacao.status === 'Agendada' ? (
        <FormularioCaptacao videomakers={videomakers} captacao={captacao} />
      ) : (
        <p className="text-sm text-[var(--texto-suave)]">
          Esta Captação não pode ser editada (status: {captacao.status}).
        </p>
      )}
    </ContainerPagina>
  );
}
