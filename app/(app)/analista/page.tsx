import { exigirModulo } from '@/lib/auth';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';
import { FormPergunta } from '@/features/analista/components/FormPergunta';

export const dynamic = 'force-dynamic';

export default async function PaginaAnalista() {
  await exigirModulo('analista');

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina
        grupo="Acompanhamento"
        titulo="Analista"
        descricao="Perguntas sobre a produção já registrada no LouFlow. Demandas concluídas, atrasadas, tempo médio de edição e resumo de um dia."
      />
      <FormPergunta />
    </ContainerPagina>
  );
}
