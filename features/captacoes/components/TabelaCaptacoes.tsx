import Link from 'next/link';
import type { Captacao } from '../consultas';
import { BadgeStatusCaptacao } from './BadgeStatusCaptacao';
import s from './captacoes.module.css';

function formatarJanela(starts: Date, ends: Date): string {
  const dtf = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
  const dtfHora = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
  return `${dtf.format(starts)} – ${dtfHora.format(ends)}`;
}

export function TabelaCaptacoes({ captacoes, podeGerenciar }: { captacoes: Captacao[]; podeGerenciar: boolean }) {
  if (captacoes.length === 0) {
    return <p className={s.suave}>Nenhuma Captação encontrada.</p>;
  }

  return (
    <div className={s.tabelaWrap}>
      <table className={s.tabela}>
        <thead>
          <tr>
            <th>Videomaker</th>
            <th>Janela</th>
            <th>Cliente / Assunto</th>
            <th>Local</th>
            <th>Status</th>
            {podeGerenciar && <th></th>}
          </tr>
        </thead>
        <tbody>
          {captacoes.map((c) => (
            <tr key={c.id}>
              <td>{c.videomakerNome}</td>
              <td className={s.suave}>{formatarJanela(c.startsAt, c.endsAt)}</td>
              <td>{[c.client, c.subject].filter(Boolean).join(' · ') || <span className={s.suave}>—</span>}</td>
              <td>{c.location ?? <span className={s.suave}>—</span>}</td>
              <td>
                <BadgeStatusCaptacao status={c.status} />
              </td>
              {podeGerenciar && (
                <td>
                  {c.status === 'Agendada' && (
                    <Link href={`/captacoes/${c.id}`} className={s.link}>
                      Editar
                    </Link>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
