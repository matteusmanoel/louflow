import type { DemandaStatus } from '../consultas';

type Estilo = { fundo: string; texto: string; borda?: string };

const estilos: Record<DemandaStatus, Estilo> = {
  'Não iniciada': {
    fundo: 'var(--chip-leitura-fundo)',
    texto: 'var(--chip-leitura-texto)',
    borda: 'var(--chip-leitura-borda)',
  },
  'Em execução': {
    fundo: 'var(--prioridade-normal-fundo)',
    texto: 'var(--prioridade-normal-texto)',
  },
  'Pausada': {
    fundo: 'var(--prioridade-alta-fundo)',
    texto: 'var(--prioridade-alta-texto)',
  },
  'Aprovação': {
    fundo: 'var(--chip-aprovacao-fundo)',
    texto: 'var(--chip-aprovacao-texto)',
    borda: 'var(--chip-aprovacao-borda)',
  },
  'Ajustes solicitados': {
    fundo: 'var(--prioridade-urgente-fundo)',
    texto: 'var(--prioridade-urgente-texto)',
  },
  'Concluída': {
    fundo: 'var(--loumar-100)',
    texto: 'var(--loumar-800)',
  },
  'Reprovada': {
    fundo: 'var(--prioridade-urgente-fundo)',
    texto: 'var(--prioridade-urgente-texto)',
  },
  'Cancelada': {
    fundo: 'var(--chip-leitura-fundo)',
    texto: 'var(--texto-suave)',
    borda: 'var(--chip-leitura-borda)',
  },
};

export function BadgeStatus({ status }: { status: DemandaStatus }) {
  const { fundo, texto, borda } = estilos[status];
  return (
    <span
      style={{
        background: fundo,
        color: texto,
        border: borda ? `1px solid ${borda}` : 'none',
        padding: '2px 10px',
        borderRadius: 'var(--raio-pilula)',
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {status}
    </span>
  );
}
