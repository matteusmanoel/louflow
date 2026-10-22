'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import type { Demanda } from '../consultas';
import { assumirFicha } from '../actions';
import { BadgePrioridade } from './BadgePrioridade';

function formatarData(valor: string | null): string {
  if (!valor) return '—';
  const [ano, mes, dia] = valor.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function FilaDeFichas({ demandas }: { demandas: Demanda[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleAssumir(demandaId: string) {
    startTransition(async () => {
      const resultado = await assumirFicha({ demandaId });
      if (resultado.ok) {
        router.refresh();
      } else {
        alert(resultado.mensagem);
      }
    });
  }

  if (demandas.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          color: 'var(--texto-suave)',
          padding: '40px 20px',
          background: 'var(--superficie)',
          borderRadius: 'var(--raio-card)',
          border: '1px solid var(--borda-app)',
        }}
      >
        A Fila de Fichas está vazia. Nenhuma demanda aguarda Editor.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {demandas.map((d) => (
        <article
          key={d.id}
          style={{
            background: 'var(--superficie)',
            border: '1px solid var(--borda-app)',
            borderRadius: 'var(--raio-card)',
            boxShadow: 'var(--sombra-card)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--texto-forte)' }}>
              {d.title}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--texto-suave)', marginTop: 4, display: 'flex', gap: 12 }}>
              <span>{d.format}</span>
              {d.influencer_nome && <span>👤 {d.influencer_nome}</span>}
              {d.prazo_efetivo && <span>📅 {formatarData(d.prazo_efetivo)}</span>}
            </div>
          </div>

          <BadgePrioridade prioridade={d.priority} />

          <button
            type="button"
            onClick={() => void handleAssumir(d.id)}
            disabled={isPending}
            style={{
              background: 'var(--loumar-700)',
              color: 'var(--branco)',
              border: 'none',
              borderRadius: 'var(--raio-botao)',
              padding: '8px 18px',
              fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.7 : 1,
              fontSize: '0.875rem',
              boxShadow: 'var(--sombra-botao)',
            }}
          >
            Assumir
          </button>
        </article>
      ))}
    </div>
  );
}
