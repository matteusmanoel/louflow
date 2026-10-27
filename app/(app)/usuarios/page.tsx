import Link from 'next/link';
import { Plus } from 'lucide-react';
import { exigirModulo } from '@/lib/auth';
import { listarUsuarios } from '@/features/usuarios/consultas';
import { TabelaUsuarios } from '@/features/usuarios/components/TabelaUsuarios';
import { Button } from '@/components/ui/button';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaUsuarios() {
  await exigirModulo('usuarios');
  const usuarios = await listarUsuarios();

  return (
    <ContainerPagina>
      <CabecalhoPagina
        grupo="Administração"
        titulo="Usuários"
        acao={
          <Button asChild>
            <Link href="/usuarios/novo">
              <Plus className="h-4 w-4" aria-hidden />
              Novo usuário
            </Link>
          </Button>
        }
      />
      <TabelaUsuarios usuarios={usuarios} />
    </ContainerPagina>
  );
}
