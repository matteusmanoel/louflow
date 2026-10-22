import { exigirModulo } from '@/lib/auth';
import { Titulo, TextoSuave } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function PaginaFichaTecnica() {
  const usuario = await exigirModulo('ficha-tecnica');

  return (
    <main style={{ padding: 'var(--conteudo-padding)', maxWidth: 800 }}>
      <Titulo sobre="Produção">Ficha Técnica</Titulo>

      <TextoSuave>
        {usuario.permissoes.editarDemandas
          ? 'Para editar a Ficha Técnica de uma Demanda, acesse o detalhe da Demanda e utilize a seção Ficha Técnica.'
          : 'Para visualizar ou preencher a Ficha Técnica, acesse o detalhe da Demanda correspondente.'}
      </TextoSuave>
    </main>
  );
}
