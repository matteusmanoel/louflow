import { exigirModulo } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';
import { Input } from '@/components/ui/input';
import { FormularioSorteio } from '@/features/sorteios/components/FormularioSorteio';
import { ListaSorteios } from '@/features/sorteios/components/ListaSorteios';
import { listarSorteios } from '@/features/sorteios/consultas';

export const dynamic = 'force-dynamic';

export default async function PaginaSorteios({
  searchParams,
}: {
  searchParams: Promise<{ termo?: string; ano?: string }>;
}) {
  const usuario = await exigirModulo('sorteios');
  const { termo = '', ano = '' } = await searchParams;
  const lista = await listarSorteios(usuario, termo, ano);

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Acompanhamento"
        titulo="Sorteios"
        descricao="Ganhadores, prêmios e registro de retirada."
        acao={
          <form className="flex flex-wrap items-end gap-2" method="get">
            <label className="grid gap-1 text-xs font-medium text-[var(--texto-suave)]">
              Busca
              <Input name="termo" defaultValue={termo} maxLength={100} placeholder="Nome, prêmio ou campanha" />
            </label>
            <label className="grid gap-1 text-xs font-medium text-[var(--texto-suave)]">
              Ano
              <select
                name="ano"
                defaultValue={ano}
                className="h-9 rounded-[var(--raio-input)] border border-[var(--border)] bg-[var(--superficie)] px-3 text-sm"
              >
                <option value="">Todos</option>
                {lista.anos.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit">Filtrar</Button>
          </form>
        }
      />
      <FormularioSorteio />
      <ListaSorteios registros={lista.registros} total={lista.total} />
    </ContainerPagina>
  );
}
