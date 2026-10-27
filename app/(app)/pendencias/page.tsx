import { exigirModulo } from '@/lib/auth';
import { listarPendencias, listarAdiamentos } from '@/features/pendencias/consultas';
import { CartaoPendencia } from '@/features/pendencias/components/CartaoPendencia';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { CheckCircle2 } from 'lucide-react';

export default async function PaginaPendencias() {
  const usuario = await exigirModulo('pendencias');
  const pendencias = await listarPendencias(usuario.id);

  const comAdiamentos = await Promise.all(
    pendencias.map(async (p) => ({
      pendencia: p,
      adiamentos: await listarAdiamentos(p.id),
    })),
  );

  return (
    <ContainerPagina>
      <CabecalhoPagina grupo="Postagem" titulo="Pendências" />

      {comAdiamentos.length === 0 ? (
        <EstadoVazio
          icone={CheckCircle2}
          titulo="Nenhuma pendência"
          descricao="Você não tem pendências no momento."
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {comAdiamentos.map(({ pendencia, adiamentos }) => (
            <li key={pendencia.id}>
              <CartaoPendencia pendencia={pendencia} adiamentos={adiamentos} />
            </li>
          ))}
        </ul>
      )}
    </ContainerPagina>
  );
}
