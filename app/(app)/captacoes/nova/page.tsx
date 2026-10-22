import { redirect } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import { Titulo, Cartao } from '@/components/ui';
import { listarVideomakersDb } from '@/features/captacoes/consultas';
import { FormularioCaptacao } from '@/features/captacoes/components/FormularioCaptacao';

export default async function PaginaNovaCaptatacao() {
  const usuario = await exigirModulo('captacoes');
  if (!usuario.permissoes.gerenciarCaptacoes) redirect('/captacoes');

  const videomakers = await listarVideomakersDb();

  return (
    <main style={{ padding: '24px', maxWidth: 640, margin: '0 auto' }}>
      <Titulo sobre="Captações">Nova Captação</Titulo>
      <div style={{ marginTop: 16 }}>
        <Cartao>
          <FormularioCaptacao videomakers={videomakers} />
        </Cartao>
      </div>
    </main>
  );
}
