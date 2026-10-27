import { notFound, redirect } from 'next/navigation';
import { exigirModulo } from '@/lib/auth';
import {
  carregarDemandaPagina,
  carregarEditoresPagina,
  carregarFormatosPagina,
  carregarInfluencersPagina,
} from '@/features/demandas/consultas';
import { FormDemanda } from '@/features/demandas/components/FormDemanda';

export async function FormularioDemandaPagina({
  variante,
  id,
}: {
  variante: 'pagina' | 'modal';
  id?: string;
}) {
  const usuario = await exigirModulo('demandas');

  if (!id && !usuario.permissoes.criarDemandas) {
    redirect('/demandas?aviso=sem-permissao');
  }
  if (id && !usuario.permissoes.editarDemandas) {
    redirect(`/demandas/${id}?aviso=sem-permissao`);
  }

  const [demanda, formatos, editores, influencers] = await Promise.all([
    id ? carregarDemandaPagina(id) : Promise.resolve(undefined),
    carregarFormatosPagina(),
    carregarEditoresPagina(),
    carregarInfluencersPagina(),
  ]);

  if (id && !demanda) notFound();

  return (
    <FormDemanda
      variante={variante}
      demanda={demanda ?? undefined}
      formatos={formatos}
      editores={editores}
      influencers={influencers}
      podeDefinirOutroEditor={usuario.permissoes.definirOutroEditor || usuario.permissoes.atribuirEditor}
      podeExcluir={Boolean(id) && usuario.permissoes.excluirDemandas}
    />
  );
}
