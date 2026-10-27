import Link from 'next/link';
import { Plus } from 'lucide-react';
import { exigirModulo } from '@/lib/auth';
import { listarCaptacoesDb } from '@/features/captacoes/consultas';
import { TabelaCaptacoes } from '@/features/captacoes/components/TabelaCaptacoes';
import { Button } from '@/components/ui/button';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaCaptacoes() {
  const usuario = await exigirModulo('captacoes');
  const captacoes = await listarCaptacoesDb(usuario);

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Recursos"
        titulo="Captações"
        acao={
          usuario.permissoes.gerenciarCaptacoes ? (
            <Button asChild>
              <Link href="/captacoes/nova">
                <Plus className="h-4 w-4" aria-hidden />
                Nova Captação
              </Link>
            </Button>
          ) : undefined
        }
      />
      <TabelaCaptacoes captacoes={captacoes} podeGerenciar={usuario.permissoes.gerenciarCaptacoes} />
    </ContainerPagina>
  );
}
