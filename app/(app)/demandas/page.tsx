import Link from 'next/link';
import { Plus } from 'lucide-react';
import { exigirModulo } from '@/lib/auth';
import { modulo } from '@/lib/modules';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';
import {
  carregarDemandasPagina,
  carregarResumoPorEditorPagina,
  carregarRevisaoPagina,
  type FiltrosListarDemandas,
} from '@/features/demandas/consultas';
import { QuadroDemandas } from '@/features/demandas/components/QuadroDemandas';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ visao?: string }> };

export default async function PaginaDemandas({ searchParams }: Props) {
  const usuario = await exigirModulo('demandas');
  const { visao } = await searchParams;

  const [demandas, resumo, revisao] = await Promise.all([
    carregarDemandasPagina(usuario),
    carregarResumoPorEditorPagina(),
    carregarRevisaoPagina(),
  ]);

  async function buscarDemandasAction(filtros: FiltrosListarDemandas) {
    'use server';
    const { obterSessao } = await import('@/lib/auth');
    const u = await obterSessao();
    if (!u) return [];
    const { carregarDemandasPagina: buscar } = await import('@/features/demandas/consultas');
    return buscar(u, filtros);
  }

  const atalhos = [
    modulo('pendencias')?.permitido(usuario) ? { href: '/pendencias', rotulo: 'Ver pendências' } : null,
    modulo('agenda')?.permitido(usuario) ? { href: '/agenda', rotulo: 'Ver agenda' } : null,
  ].filter((item): item is { href: string; rotulo: string } => item != null);

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Produção"
        titulo="Demandas"
        acao={
          usuario.permissoes.criarDemandas ? (
            <Button asChild>
              <Link href="/demandas/nova">
                <Plus className="h-4 w-4" aria-hidden />
                Nova demanda
              </Link>
            </Button>
          ) : undefined
        }
      />
      {atalhos.length > 0 && (
        <nav aria-label="Atalhos" className="-mt-2 flex gap-4 text-sm">
          {atalhos.map((atalho) => (
            <Link key={atalho.href} href={atalho.href} className="font-medium text-[var(--loumar-700)]">
              {atalho.rotulo}
            </Link>
          ))}
        </nav>
      )}

      <QuadroDemandas
        demandasIniciais={demandas}
        resumoEditores={resumo}
        buscarDemandas={buscarDemandasAction}
        revisaoInicial={revisao}
        podeCriar={usuario.permissoes.criarDemandas}
        visao={visao === 'quadro' ? 'quadro' : 'lista'}
        podeMover={usuario.permissoes.alterarStatus}
        podeEntregar={usuario.permissoes.editarDemandas}
      />
    </ContainerPagina>
  );
}
