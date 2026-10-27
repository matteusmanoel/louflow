import { exigirModulo } from '@/lib/auth';
import { listarPreferencias } from '@/features/notificacoes/consultas';
import { FormularioPreferencias } from '@/features/notificacoes/components/FormularioPreferencias';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaPreferencias() {
  const usuario = await exigirModulo('preferencias');
  const preferencias = await listarPreferencias(usuario.id);

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina
        grupo="Conta"
        titulo="Preferências"
        descricao="Escolha quais eventos você deseja receber por e-mail."
      />
      <FormularioPreferencias preferencias={preferencias} />
    </ContainerPagina>
  );
}
