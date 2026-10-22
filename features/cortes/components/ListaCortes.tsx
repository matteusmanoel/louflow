'use client';

import type { Corte } from '../consultas';
import s from './cortes.module.css';

const rotuloProgramaOrigem: Record<string, string> = {
  'Destino Iguaçu News': 'Destino Iguaçu',
  'Descubra Foz': 'Descubra Foz',
  Outros: 'Outros',
};

function BadgeStatus({ status }: { status: string }) {
  return (
    <span
      className={[s.badge, status === 'Concluído' ? s.badgeConcluido : s.badgeEmAndamento].join(' ')}
    >
      {status}
    </span>
  );
}

function BadgeLinha({ linha }: { linha: string }) {
  const mapa: Record<string, string | undefined> = { Viral: s.linhaViral, Comunidade: s.linhaComunidade, Educacional: s.linhaEducacional };
  return <span className={[s.badge, mapa[linha] ?? ''].join(' ')}>{linha}</span>;
}

export function ListaCortes({ cortes }: { cortes: Corte[] }) {
  if (cortes.length === 0) {
    return <p className={s.vazio}>Nenhum corte cadastrado ainda.</p>;
  }

  return (
    <div className={s.tabela} role="table" aria-label="Cortes">
      <div className={s.cabecalho} role="row">
        <span role="columnheader">Título</span>
        <span role="columnheader">Programa</span>
        <span role="columnheader">Linha</span>
        <span role="columnheader">Postagem</span>
        <span role="columnheader">Editor</span>
        <span role="columnheader">Qtd.</span>
        <span role="columnheader">Status</span>
      </div>

      {cortes.map((c) => (
        <div key={c.id} className={s.linha} role="row">
          <span role="cell" className={s.tituloCell}>
            {c.linkVideo ? (
              <a href={c.linkVideo} target="_blank" rel="noopener noreferrer" className={s.link}>
                {c.titulo}
              </a>
            ) : (
              c.titulo
            )}
          </span>
          <span role="cell">{rotuloProgramaOrigem[c.programaOrigem] ?? c.programaOrigem}</span>
          <span role="cell">
            <BadgeLinha linha={c.linhaEditorial} />
          </span>
          <span role="cell">{c.dataPostagem}</span>
          <span role="cell">{c.editorNome}</span>
          <span role="cell">{c.quantidadeProduzida ?? '—'}</span>
          <span role="cell">
            <BadgeStatus status={c.status} />
          </span>
        </div>
      ))}
    </div>
  );
}
