import { exigirModulo } from '@/lib/auth';
import { listarCortes } from '@/features/cortes/consultas';
import { ListaCortes } from '@/features/cortes/components/ListaCortes';
import { FormCriarCorte } from '@/features/cortes/components/FormCriarCorte';
import { Cartao, Titulo } from '@/components/ui';

export default async function PaginaCortes() {
  const usuario = await exigirModulo('cortes');
  const cortes = await listarCortes();

  const podeGerenciar = usuario.permissoes.editorPadraoCortes;

  return (
    <main style={{ padding: 'var(--conteudo-padding)', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Titulo>Cortes</Titulo>

      {podeGerenciar && (
        <Cartao>
          <FormCriarCorte />
        </Cartao>
      )}

      <Cartao>
        <ListaCortes cortes={cortes} />
      </Cartao>
    </main>
  );
}
