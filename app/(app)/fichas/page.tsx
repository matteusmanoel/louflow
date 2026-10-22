import { exigirModulo } from '@/lib/auth';
import { carregarFilaDeFichasPagina } from '@/features/demandas/consultas';
import { FilaDeFichas } from '@/features/demandas/components/FilaDeFichas';
import { Titulo } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function PaginaFilaDeFichas() {
  await exigirModulo('fichas');

  const demandas = await carregarFilaDeFichasPagina();

  return (
    <main style={{ padding: 'var(--conteudo-padding)' }}>
      <Titulo sobre="Produção">Fila de Fichas</Titulo>
      <p style={{ color: 'var(--texto-suave)', fontSize: '0.875rem', marginBottom: 20, marginTop: 4 }}>
        Demandas aguardando Editor. Assuma para começar.
      </p>

      <FilaDeFichas demandas={demandas} />
    </main>
  );
}
