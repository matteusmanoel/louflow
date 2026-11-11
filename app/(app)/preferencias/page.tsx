import { exigirModulo } from '@/lib/auth';
import { lerCadencia } from '@/features/notificacoes/consultas';
import { FormularioAvisos } from '@/features/notificacoes/components/FormularioAvisos';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';

export default async function PaginaAvisos() {
  await exigirModulo('preferencias');
  const cadencia = await lerCadencia();

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina
        grupo="Conta"
        titulo="Avisos"
        descricao="O WhatsApp do setor recebe atribuição, ajuste, aprovação, prazo e pendência."
      />
      <FormularioAvisos cadencia={cadencia} />
    </ContainerPagina>
  );
}
