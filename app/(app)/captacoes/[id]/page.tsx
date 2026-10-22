import { notFound, redirect } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import { Titulo, Cartao } from '@/components/ui';
import { obterCaptacaoDb, listarVideomakersDb } from '@/features/captacoes/consultas';
import { FormularioCaptacao, BotaoCancelarCaptacao } from '@/features/captacoes/components/FormularioCaptacao';
import { BadgeStatusCaptacao } from '@/features/captacoes/components/BadgeStatusCaptacao';

export default async function PaginaCaptacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await exigirModulo('captacoes');
  if (!usuario.permissoes.gerenciarCaptacoes) redirect('/captacoes');

  const [captacao, videomakers] = await Promise.all([obterCaptacaoDb(id), listarVideomakersDb()]);
  if (!captacao) notFound();

  return (
    <main style={{ padding: '24px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Titulo sobre="Captações">Editar Captação</Titulo>
        <BadgeStatusCaptacao status={captacao.status} />
      </div>

      <Cartao>
        {captacao.status === 'Agendada' ? (
          <>
            <FormularioCaptacao videomakers={videomakers} captacao={captacao} />
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--borda-app)' }}>
              <BotaoCancelarCaptacao id={captacao.id} />
            </div>
          </>
        ) : (
          <p style={{ color: 'var(--texto-suave)' }}>
            Esta Captação não pode ser editada (status: {captacao.status}).
          </p>
        )}
      </Cartao>
    </main>
  );
}
