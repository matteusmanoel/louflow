import type { PropsSecaoDemanda } from '@/features/demandas/secoes';
import { listarComentariosDb } from '../consultas';
import { BotaoExcluirComentario } from './BotaoExcluirComentario';
import { FormComentario } from './FormComentario';
import s from './ComentariosSecao.module.css';

/**
 * Seção reservada do detalhe da Demanda: Comentários da Demanda.
 * Dona: S1-12 (#11567). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function ComentariosSecao({ demandaId, usuario }: PropsSecaoDemanda) {
  const comentarios = await listarComentariosDb(demandaId);

  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section className={s.secao} aria-label="Comentários">
      <h3 className={s.titulo}>Comentários {comentarios.length > 0 ? `(${comentarios.length})` : ''}</h3>

      {comentarios.length === 0 ? (
        <p className={s.vazio}>Nenhum comentário ainda.</p>
      ) : (
        <ul className={s.lista} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {comentarios.map((c) => {
            const ehDono = c.autorId === usuario.id;
            const podExcluir = ehDono || usuario.permissoes.gerenciarUsuarios;
            return (
              <li key={c.id} className={s.comentario}>
                <div className={s.cabecalho}>
                  <span className={s.autor}>{c.autorNome}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <time className={s.data} dateTime={c.criadoEm.toISOString()}>
                      {fmt.format(new Date(c.criadoEm))}
                    </time>
                    {podExcluir ? <BotaoExcluirComentario comentarioId={c.id} /> : null}
                  </div>
                </div>
                <p className={s.corpo}>{c.conteudo}</p>
              </li>
            );
          })}
        </ul>
      )}

      <FormComentario demandaId={demandaId} />
    </section>
  );
}
