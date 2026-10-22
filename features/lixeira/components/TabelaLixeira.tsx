'use client';

import { useTransition } from 'react';
import type { DemandaLixeira } from '../consultas';
import { restaurarDemanda, excluirDefinitivamente } from '../actions';
import { Botao } from '@/components/ui';

type Props = {
  demandas: DemandaLixeira[];
  podeGerenciar: boolean;
};

export function TabelaLixeira({ demandas, podeGerenciar }: Props) {
  const [pending, startTransition] = useTransition();

  if (demandas.length === 0) {
    return <p style={{ color: 'var(--cor-texto-secundario)', marginTop: 16 }}>Nenhuma demanda na lixeira.</p>;
  }

  function handleRestaurar(demandaId: string) {
    startTransition(async () => {
      const res = await restaurarDemanda({ demandaId });
      if (!res.ok) alert(res.mensagem);
      else window.location.reload();
    });
  }

  function handleExcluir(demandaId: string, title: string) {
    if (!confirm(`Excluir definitivamente "${title}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const res = await excluirDefinitivamente({ demandaId });
      if (!res.ok) alert(res.mensagem);
      else window.location.reload();
    });
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--cor-borda)' }}>
            <th style={{ padding: '8px 12px' }}>ID</th>
            <th style={{ padding: '8px 12px' }}>Título</th>
            <th style={{ padding: '8px 12px' }}>Formato</th>
            <th style={{ padding: '8px 12px' }}>Status</th>
            <th style={{ padding: '8px 12px' }}>Excluída em</th>
            <th style={{ padding: '8px 12px' }}>Por</th>
            {podeGerenciar && <th style={{ padding: '8px 12px' }}>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {demandas.map((d) => (
            <tr key={d.id} style={{ borderBottom: '1px solid var(--cor-borda)' }}>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 13 }}>{d.id}</td>
              <td style={{ padding: '8px 12px' }}>{d.title}</td>
              <td style={{ padding: '8px 12px' }}>{d.format}</td>
              <td style={{ padding: '8px 12px' }}>{d.status}</td>
              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                {new Date(d.deleted_at).toLocaleString('pt-BR')}
              </td>
              <td style={{ padding: '8px 12px' }}>{d.deletado_por_nome ?? '—'}</td>
              {podeGerenciar && (
                <td style={{ padding: '8px 12px', display: 'flex', gap: 8 }}>
                  <Botao
                    variante="neutro"
                    disabled={pending}
                    onClick={() => handleRestaurar(d.id)}
                    style={{ fontSize: 13, padding: '4px 10px' }}
                  >
                    Restaurar
                  </Botao>
                  <Botao
                    variante="neutro"
                    disabled={pending}
                    onClick={() => handleExcluir(d.id, d.title)}
                    style={{ fontSize: 13, padding: '4px 10px', color: 'var(--cor-erro, red)' }}
                  >
                    Excluir
                  </Botao>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
