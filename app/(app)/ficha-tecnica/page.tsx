import { exigirModulo } from '@/lib/auth';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';
import { carregarEditoresPagina } from '@/features/demandas/consultas';
import { FormEnviarFicha } from '@/features/fichas/components/FormEnviarFicha';

export const dynamic = 'force-dynamic';

export default async function PaginaFichaTecnica() {
  const usuario = await exigirModulo('ficha-tecnica');
  // Só o Influencer envia (a Server Action confere de novo); os demais perfis veem a orientação.
  const podeEnviar = usuario.perfil === 'Influencer' && usuario.permissoes.enviarFicha;
  const editores = podeEnviar ? await carregarEditoresPagina() : [];

  return (
    <ContainerPagina largura="formulario">
      <CabecalhoPagina grupo="Produção" titulo="Ficha Técnica" />
      {podeEnviar ? (
        <>
          <p className="text-sm text-[var(--texto-suave)]">
            Envie a ficha do conteúdo. O envio cria uma Demanda de formato Ficha técnica, que entra na Fila de Fichas
            até um Editor assumir.
          </p>
          <FormEnviarFicha editores={editores.map((editor) => ({ id: editor.id, label: editor.label }))} />
        </>
      ) : (
        <p className="text-sm text-[var(--texto-suave)]">
          {usuario.permissoes.editarDemandas
            ? 'Para editar a Ficha Técnica de uma Demanda, acesse o detalhe da Demanda e utilize a seção Ficha Técnica.'
            : 'Para visualizar a Ficha Técnica, acesse o detalhe da Demanda correspondente.'}
        </p>
      )}
    </ContainerPagina>
  );
}
