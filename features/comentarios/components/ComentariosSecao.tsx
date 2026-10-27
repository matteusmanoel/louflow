import type { PropsSecaoDemanda } from '@/features/demandas/secoes';
import { listarComentariosDb } from '../consultas';
import { BotaoExcluirComentario } from './BotaoExcluirComentario';
import { FormComentario } from './FormComentario';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { formatarDataHora } from '@/lib/datas';
import { MessageSquare } from 'lucide-react';

/**
 * Seção reservada do detalhe da Demanda: Comentários da Demanda.
 * Dona: S1-12 (#11567). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function ComentariosSecao({ demandaId, usuario }: PropsSecaoDemanda) {
  const comentarios = await listarComentariosDb(demandaId);

  return (
    <section
      aria-label="Comentários"
      className="flex flex-col gap-3 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-5 shadow-[var(--sombra-card)]"
    >
      <h3 className="text-base font-semibold text-[var(--texto-forte)] m-0">
        Comentários {comentarios.length > 0 ? `(${comentarios.length})` : ''}
      </h3>

      {comentarios.length === 0 ? (
        <EstadoVazio
          icone={MessageSquare}
          titulo="Nenhum comentário"
          descricao="Seja o primeiro a comentar nesta demanda."
        />
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-1">
          {comentarios.map((c) => {
            const ehDono = c.autorId === usuario.id;
            const podExcluir = ehDono || usuario.permissoes.gerenciarUsuarios;
            return (
              <li
                key={c.id}
                className="flex flex-col gap-1.5 py-3 border-b border-[var(--tabela-linha-borda)] last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--texto-forte)]">{c.autorNome}</span>
                  <div className="flex items-center gap-2">
                    <time className="text-xs tabular-nums text-[var(--texto-suave)]" dateTime={c.criadoEm.toISOString()}>
                      {formatarDataHora(c.criadoEm)}
                    </time>
                    {podExcluir && <BotaoExcluirComentario comentarioId={c.id} />}
                  </div>
                </div>
                <p className="text-sm text-[var(--texto-forte)] m-0 whitespace-pre-wrap">{c.conteudo}</p>
              </li>
            );
          })}
        </ul>
      )}

      <FormComentario demandaId={demandaId} />
    </section>
  );
}
