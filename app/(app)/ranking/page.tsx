import { exigirModulo } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';
import { Input } from '@/components/ui/input';
import { periodoOuPadrao } from '@/features/metricas/periodo';
import { formatarData } from '@/lib/datas';
import { TabelaRanking } from '@/features/ranking/components/TabelaRanking';
import { carregarRanking } from '@/features/ranking/consultas';

export const dynamic = 'force-dynamic';

export default async function PaginaRanking({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string }>;
}) {
  const usuario = await exigirModulo('ranking');
  const { inicio, fim } = await searchParams;
  const periodo = periodoOuPadrao(inicio, fim);
  const linhas = await carregarRanking(usuario, periodo);

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Acompanhamento"
        titulo="Ranking"
        descricao={`Produção de ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}. O tempo médio usa os ciclos concluídos no período.`}
        acao={
          <form className="flex flex-wrap items-end gap-2" method="get">
            <label className="grid gap-1 text-xs font-medium text-[var(--texto-suave)]">
              Início
              <Input type="date" name="inicio" defaultValue={periodo.inicio} required />
            </label>
            <label className="grid gap-1 text-xs font-medium text-[var(--texto-suave)]">
              Fim
              <Input type="date" name="fim" defaultValue={periodo.fim} required />
            </label>
            <Button type="submit">Atualizar</Button>
          </form>
        }
      />
      <TabelaRanking linhas={linhas} />
    </ContainerPagina>
  );
}
