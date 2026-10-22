import { exigirModulo } from '@/lib/auth';
import { listarAprovacoes } from '@/features/aprovacoes/consultas';

export default async function PaginaAprovacoes() {
  const usuario = await exigirModulo('aprovacoes');
  const aprovacoes = await listarAprovacoes(usuario);

  return (
    <main>
      <h1>Aprovações</h1>
      {aprovacoes.length === 0 ? (
        <p>Nenhuma entrega aguardando aprovação.</p>
      ) : (
        <ul>
          {aprovacoes.map((a) => (
            <li key={a.entregaId}>
              <strong>{a.demandaTitulo}</strong>
              <span> — v{a.versao}</span>
              <span> — {a.editorNome}</span>
              <a href={a.link} target="_blank" rel="noopener noreferrer">
                Ver arquivo
              </a>
              {a.nota && <p>{a.nota}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
