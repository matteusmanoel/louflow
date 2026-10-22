import { exigirModulo } from '@/lib/auth';
import { listarAuditoria } from '@/features/auditoria/consultas';
import { TabelaAuditoria } from '@/features/auditoria/components/TabelaAuditoria';
import { Titulo } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function PaginaAuditoria() {
  await exigirModulo('auditoria');
  const { registros, total, pagina, totalPaginas } = await listarAuditoria(1);

  return (
    <main style={{ padding: 'var(--conteudo-padding)' }}>
      <Titulo sobre="Administração">Auditoria</Titulo>
      <p style={{ color: 'var(--cor-texto-secundario)', marginBottom: 16 }}>
        Log de ações administrativas do sistema.
      </p>
      <TabelaAuditoria
        registros={registros}
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
      />
    </main>
  );
}
