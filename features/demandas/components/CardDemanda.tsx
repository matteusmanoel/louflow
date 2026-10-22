import Link from 'next/link';
import type { Demanda } from '../consultas';
import { BadgePrioridade } from './BadgePrioridade';
import { BadgeStatus } from './BadgeStatus';

function formatarData(valor: string | null): string {
  if (!valor) return '—';
  const [ano, mes, dia] = valor.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function CardDemanda({ demanda }: { demanda: Demanda }) {
  const prazoFormatado = formatarData(demanda.prazo_efetivo);

  return (
    <article
      style={{
        background: demanda.atrasada ? 'var(--linha-atrasada-fundo)' : 'var(--superficie)',
        border: `1px solid ${demanda.atrasada ? 'var(--alerta-atrasada)' : 'var(--borda-app)'}`,
        borderRadius: 'var(--raio-card)',
        boxShadow: 'var(--sombra-card)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <Link
          href={`/demandas/${demanda.id}`}
          style={{
            color: demanda.atrasada ? 'var(--alerta-atrasada)' : 'var(--texto-forte)',
            fontWeight: 600,
            fontSize: '0.9rem',
            textDecoration: 'none',
            flex: 1,
          }}
        >
          {demanda.title}
        </Link>
        <BadgePrioridade prioridade={demanda.priority} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <BadgeStatus status={demanda.status} />
        <span style={{ fontSize: '0.78rem', color: 'var(--texto-suave)' }}>{demanda.format}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.8rem', color: 'var(--texto-suave)' }}>
        {demanda.editor_label || demanda.editor_nome ? (
          <span>
            ✏️ {demanda.editor_label ?? demanda.editor_nome}
          </span>
        ) : (
          <span style={{ color: 'var(--alerta-hoje)' }}>✏️ A definir</span>
        )}
        {demanda.influencer_nome && (
          <span>👤 {demanda.influencer_nome}</span>
        )}
        {demanda.prazo_efetivo && (
          <span style={{ color: demanda.atrasada ? 'var(--alerta-atrasada)' : undefined }}>
            📅 {prazoFormatado}
            {demanda.atrasada && ' · ATRASADA'}
          </span>
        )}
      </div>
    </article>
  );
}
