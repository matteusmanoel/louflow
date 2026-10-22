import type { PropsSecaoDemanda } from '@/features/demandas/secoes';
import { listarHistoricoDb } from '../consultas';
import s from './HistoricoSecao.module.css';

/**
 * Seção reservada do detalhe da Demanda: Linha do tempo do Histórico (somente leitura).
 * Dona: S1-12 (#11567). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function HistoricoSecao({ demandaId, usuario }: PropsSecaoDemanda) {
  void usuario;
  const entradas = await listarHistoricoDb(demandaId);

  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <section className={s.secao} aria-label="Histórico">
      <h3 className={s.titulo}>Histórico</h3>

      {entradas.length === 0 ? (
        <p className={s.vazio}>Nenhuma atividade registrada.</p>
      ) : (
        <ul className={s.lista}>
          {entradas.map((e) => (
            <li key={e.id} className={s.linha}>
              <span className={s.pontoDia} aria-hidden="true" />
              <div className={s.conteudo}>
                <span className={s.acao}>{e.acao}</span>
                <span className={s.meta}>
                  {e.usuarioNome ?? 'Sistema'}{' '}
                  &middot;{' '}
                  <time dateTime={e.criadoEm.toISOString()}>
                    {fmt.format(new Date(e.criadoEm))}
                  </time>
                </span>
                {e.detalhes ? <p className={s.detalhes}>{e.detalhes}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
