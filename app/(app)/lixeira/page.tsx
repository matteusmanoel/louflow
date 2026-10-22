import { exigirModulo } from '@/lib/auth';
import { listarLixeira } from '@/features/lixeira/consultas';
import { TabelaLixeira } from '@/features/lixeira/components/TabelaLixeira';
import { Titulo } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function PaginaLixeira() {
  const usuario = await exigirModulo('lixeira');
  const demandas = await listarLixeira();

  return (
    <main style={{ padding: 'var(--conteudo-padding)' }}>
      <Titulo sobre="Administração">Lixeira</Titulo>
      <p style={{ color: 'var(--cor-texto-secundario)', marginBottom: 16 }}>
        Demandas excluídas. Restaure ou exclua definitivamente.
      </p>
      <TabelaLixeira demandas={demandas} podeGerenciar={usuario.permissoes.gerenciarUsuarios} />
    </main>
  );
}
