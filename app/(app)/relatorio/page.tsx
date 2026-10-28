import Link from 'next/link';
import { exigirModulo } from '@/lib/auth';
import { formatarData } from '@/lib/datas';
import { cn } from '@/lib/utils';
import { BotaoImprimir } from '@/features/relatorio/components/BotaoImprimir';
import { RelatorioDia } from '@/features/relatorio/components/RelatorioDia';
import { obterRelatorioDiario } from '@/features/relatorio/consultas';
import { deslocarDia, resolverDiaRelatorio } from '@/features/relatorio/dia';
import estilos from '@/features/relatorio/impressao.module.css';
import { Button } from '@/components/ui/button';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const dynamic = 'force-dynamic';

export default async function PaginaRelatorio({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const usuario = await exigirModulo('relatorio');
  const { dia: diaParam } = await searchParams;
  const dia = resolverDiaRelatorio(diaParam);
  const relatorio = await obterRelatorioDiario(usuario, dia);

  return (
    <div className={estilos.folha}>
      <ContainerPagina>
        <CabecalhoPagina
          grupo="Acompanhamento"
          titulo="Relatório Diário"
          descricao={`Dia ${formatarData(dia)}.`}
          acao={
            <div className={estilos.ocultarNaImpressao}>
              <BotaoImprimir />
            </div>
          }
        />

        <form
          method="get"
          action="/relatorio"
          className={cn(estilos.ocultarNaImpressao, 'flex flex-wrap items-end gap-2')}
        >
          <div className="grid w-44 gap-1.5">
            <Label htmlFor="dia-relatorio">Dia</Label>
            <Input key={dia} id="dia-relatorio" name="dia" type="date" defaultValue={dia} required />
          </div>
          <Button type="submit">Ver dia</Button>
          <Button variant="outline" asChild>
            <Link href={`/relatorio?dia=${deslocarDia(dia, -1)}`}>Dia anterior</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/relatorio">Hoje</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/relatorio?dia=${deslocarDia(dia, 1)}`}>Próximo dia</Link>
          </Button>
        </form>

        <RelatorioDia relatorio={relatorio} />
      </ContainerPagina>
    </div>
  );
}
