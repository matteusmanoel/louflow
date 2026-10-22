import Link from 'next/link';
import { exigirModulo } from '@/lib/auth';
import {
  carregarDemandasPagina,
  carregarResumoPorEditorPagina,
  carregarRevisaoPagina,
  type FiltrosListarDemandas,
} from '@/features/demandas/consultas';
import { QuadroDemandas } from '@/features/demandas/components/QuadroDemandas';
import { Titulo } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function PaginaDemandas() {
  const usuario = await exigirModulo('demandas');

  const [demandas, resumo, revisao] = await Promise.all([
    carregarDemandasPagina(usuario),
    carregarResumoPorEditorPagina(),
    carregarRevisaoPagina(),
  ]);

  /** Server action que recarrega as demandas com filtros (consumida pelo QuadroDemandas). */
  async function buscarDemandasAction(filtros: FiltrosListarDemandas) {
    'use server';
    const { obterSessao } = await import('@/lib/auth');
    const u = await obterSessao();
    if (!u) return [];
    const { carregarDemandasPagina: buscar } = await import('@/features/demandas/consultas');
    return buscar(u, filtros);
  }

  return (
    <main style={{ padding: 'var(--conteudo-padding)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Titulo sobre="Produção">Demandas</Titulo>
        {usuario.permissoes.criarDemandas && (
          <Link
            href="/demandas/nova"
            style={{
              background: 'var(--loumar-700)',
              color: 'var(--branco)',
              padding: '9px 18px',
              borderRadius: 'var(--raio-botao)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              boxShadow: 'var(--sombra-botao)',
              whiteSpace: 'nowrap',
            }}
          >
            + Nova demanda
          </Link>
        )}
      </div>

      <QuadroDemandas
        demandasIniciais={demandas}
        resumoEditores={resumo}
        buscarDemandas={buscarDemandasAction}
        revisaoInicial={revisao}
        podeCriar={usuario.permissoes.criarDemandas}
      />
    </main>
  );
}
