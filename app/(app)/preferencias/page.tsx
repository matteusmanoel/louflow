import { exigirModulo } from '@/lib/auth';
import { FormularioAvisos } from '@/features/notificacoes/components/FormularioAvisos';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaAvisos() {
  await exigirModulo('preferencias');

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina
        grupo="Conta"
        titulo="Avisos"
        descricao="O grupo do WhatsApp recebe um resumo por dia, às 10h."
      />
      <FormularioAvisos />
    </ContainerPagina>
  );
}
