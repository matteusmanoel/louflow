import { exigirModulo } from '@/lib/auth';
import { listarAuditoria } from '@/features/auditoria/consultas';
import { TabelaAuditoria } from '@/features/auditoria/components/TabelaAuditoria';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export const dynamic = 'force-dynamic';

export default async function PaginaAuditoria() {
  await exigirModulo('auditoria');
  const { registros, total, pagina, totalPaginas } = await listarAuditoria(1);

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Administração"
        titulo="Auditoria"
        descricao="Log de ações administrativas do sistema."
      />
      <TabelaAuditoria
        registros={registros}
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
      />
    </ContainerPagina>
  );
}
