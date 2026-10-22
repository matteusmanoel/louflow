import type { DemandaPrioridade } from '../consultas';

const estilos: Record<DemandaPrioridade, { fundo: string; texto: string }> = {
  Baixa: {
    fundo: 'var(--prioridade-baixa-fundo)',
    texto: 'var(--prioridade-baixa-texto)',
  },
  Normal: {
    fundo: 'var(--prioridade-normal-fundo)',
    texto: 'var(--prioridade-normal-texto)',
  },
  Alta: {
    fundo: 'var(--prioridade-alta-fundo)',
    texto: 'var(--prioridade-alta-texto)',
  },
  Urgente: {
    fundo: 'var(--prioridade-urgente-fundo)',
    texto: 'var(--prioridade-urgente-texto)',
  },
};

export function BadgePrioridade({ prioridade }: { prioridade: DemandaPrioridade }) {
  const { fundo, texto } = estilos[prioridade];
  return (
    <span
      style={{
        background: fundo,
        color: texto,
        padding: '2px 10px',
        borderRadius: 'var(--raio-pilula)',
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {prioridade}
    </span>
  );
}
