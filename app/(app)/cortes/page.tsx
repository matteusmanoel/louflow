import { exigirModulo } from '@/lib/auth';
import { listarCortes } from '@/features/cortes/consultas';
import { ListaCortes } from '@/features/cortes/components/ListaCortes';
import { FormCriarCorte } from '@/features/cortes/components/FormCriarCorte';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { Card, CardContent } from '@/components/ui/card';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaCortes() {
  const usuario = await exigirModulo('cortes');
  const cortes = await listarCortes();
  const podeGerenciar = usuario.permissoes.editorPadraoCortes;

  return (
    <ContainerPagina>
      <CabecalhoPagina grupo="Produção" titulo="Cortes" />

      {podeGerenciar && (
        <Card>
          <CardContent className="p-6">
            <FormCriarCorte />
          </CardContent>
        </Card>
      )}

      <ListaCortes cortes={cortes} podeConcluir={podeGerenciar} />
    </ContainerPagina>
  );
}
