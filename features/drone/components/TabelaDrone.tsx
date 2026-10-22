'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { Aviso } from '@/components/ui';
import type { ResultadoListarUsosDrone } from '../consultas';
import { cancelarUsoDrone } from '../actions';

type Props = ResultadoListarUsosDrone;

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function ChipStatus({ status }: { status: 'Ativo' | 'Cancelado' }) {
  const estilo: React.CSSProperties =
    status === 'Ativo'
      ? { background: 'var(--prioridade-normal-fundo)', color: 'var(--prioridade-normal-texto)' }
      : { background: 'var(--chip-leitura-fundo)', color: 'var(--chip-leitura-texto)', border: '1px solid var(--chip-leitura-borda)' };
  return (
    <span
      style={{
        ...estilo,
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
      }}
    >
      {status}
    </span>
  );
}

function LinhaAcoes({ id, status }: { id: string; status: 'Ativo' | 'Cancelado' }) {
  const [pendente, iniciarTransicao] = useTransition();

  if (status === 'Cancelado') return <span style={{ color: 'var(--texto-suave)', fontSize: 12 }}>—</span>;

  function handleCancelar() {
    if (!confirm('Cancelar este registro? A operação não pode ser desfeita.')) return;
    iniciarTransicao(async () => {
      const resultado = await cancelarUsoDrone({ id });
      if (!resultado.ok) alert(resultado.mensagem);
    });
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Link
        href={`/drone/${id}/editar`}
        style={{
          fontSize: 12,
          color: 'var(--loumar-700)',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Editar
      </Link>
      <button
        onClick={handleCancelar}
        disabled={pendente}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          color: 'var(--prioridade-urgente-texto)',
          fontWeight: 700,
          padding: 0,
          opacity: pendente ? 0.5 : 1,
        }}
      >
        {pendente ? 'Cancelando…' : 'Cancelar'}
      </button>
    </div>
  );
}

export function TabelaDrone({ usos, totalAtivosReais }: Props) {
  if (usos.length === 0) {
    return (
      <Aviso>Nenhum uso de drone registrado.</Aviso>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            background: 'var(--prioridade-normal-fundo)',
            color: 'var(--prioridade-normal-texto)',
            border: '1px solid currentColor',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          Total (registros ativos):{' '}
          <span>
            {totalAtivosReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                background: 'var(--tabela-cabecalho-fundo)',
                color: 'var(--tabela-cabecalho-texto)',
              }}
            >
              {['Data', 'Responsável', 'Perfil atendido', 'Motivo', 'Local', 'Valor', 'Status', 'Ações'].map((col) => (
                <th
                  key={col}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontWeight: 800,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--tabela-cabecalho-borda)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usos.map((uso) => (
              <tr
                key={uso.id}
                style={{
                  borderBottom: '1px solid var(--tabela-linha-borda)',
                  opacity: uso.status === 'Cancelado' ? 0.55 : 1,
                }}
              >
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatarData(uso.used_on)}</td>
                <td style={{ padding: '10px 12px' }}>{uso.responsible}</td>
                <td style={{ padding: '10px 12px' }}>{uso.served_profile}</td>
                <td style={{ padding: '10px 12px' }}>{uso.reason}</td>
                <td style={{ padding: '10px 12px' }}>{uso.location}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>R$ 250,00</td>
                <td style={{ padding: '10px 12px' }}>
                  <ChipStatus status={uso.status} />
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <LinhaAcoes id={uso.id} status={uso.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
