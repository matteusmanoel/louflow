import { exigirModulo } from '@/lib/auth';
import { listarPendencias, listarAdiamentos } from '@/features/pendencias/consultas';
import { CartaoPendencia } from '@/features/pendencias/components/CartaoPendencia';
import { Cartao, TextoSuave, Titulo } from '@/components/ui';

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
    <main style={{ padding: 'var(--conteudo-padding)', minWidth: 650 }}>
      <Titulo>Minhas Pendências</Titulo>

      {comAdiamentos.length === 0 ? (
        <Cartao>
          <TextoSuave>Nenhuma pendência no momento.</TextoSuave>
        </Cartao>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {comAdiamentos.map(({ pendencia, adiamentos }) => (
            <li key={pendencia.id}>
              <CartaoPendencia pendencia={pendencia} adiamentos={adiamentos} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
