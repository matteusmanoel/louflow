import { redirect } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import {
  carregarFormatosPagina,
  carregarEditoresPagina,
  carregarInfluencersPagina,
} from '@/features/demandas/consultas';
import { FormDemanda } from '@/features/demandas/components/FormDemanda';
import { Titulo } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function PaginaNovaDemanda() {
  const usuario = await exigirModulo('demandas');

  if (!usuario.permissoes.criarDemandas) {
    redirect('/demandas?aviso=sem-permissao');
  }

  const [formatos, editores, influencers] = await Promise.all([
    carregarFormatosPagina(),
    carregarEditoresPagina(),
    carregarInfluencersPagina(),
  ]);

  return (
    <main style={{ padding: 'var(--conteudo-padding)', maxWidth: 720 }}>
      <Titulo sobre="Demandas">Nova Demanda</Titulo>

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
          formatos={formatos}
          editores={editores}
          influencers={influencers}
          podeDefinirOutroEditor={
            usuario.permissoes.definirOutroEditor || usuario.permissoes.atribuirEditor
          }
          podeExcluir={false}
        />
      </div>
    </main>
  );
}
