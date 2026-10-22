import { notFound, redirect } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import {
  carregarDemandaPagina,
  carregarFormatosPagina,
  carregarEditoresPagina,
  carregarInfluencersPagina,
} from '@/features/demandas/consultas';
import { FormDemanda } from '@/features/demandas/components/FormDemanda';
import { Titulo } from '@/components/ui';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function PaginaEditarDemanda({ params }: Props) {
  const { id } = await params;
  const usuario = await exigirModulo('demandas');

  if (!usuario.permissoes.editarDemandas) {
    redirect(`/demandas/${id}?aviso=sem-permissao`);
  }

  const [demanda, formatos, editores, influencers] = await Promise.all([
    carregarDemandaPagina(id),
    carregarFormatosPagina(),
    carregarEditoresPagina(),
    carregarInfluencersPagina(),
  ]);

  if (!demanda) notFound();

  return (
    <main style={{ padding: 'var(--conteudo-padding)', maxWidth: 720 }}>
      <Titulo sobre="Demandas">Editar Demanda</Titulo>

      <div
        style={{
          background: 'var(--superficie)',
          border: '1px solid var(--borda-app)',
          borderRadius: 'var(--raio-painel)',
          boxShadow: 'var(--sombra-painel)',
          padding: '24px 28px',
          marginTop: 20,
        }}
      >
        <FormDemanda
          demanda={demanda}
          formatos={formatos}
          editores={editores}
          influencers={influencers}
          podeDefinirOutroEditor={
            usuario.permissoes.definirOutroEditor || usuario.permissoes.atribuirEditor
          }
          podeExcluir={usuario.permissoes.excluirDemandas}
        />
      </div>
    </main>
  );
}
