import type { RegistroAuditoria } from '../consultas';

type Props = {
  registros: RegistroAuditoria[];
  pagina: number;
  totalPaginas: number;
  total: number;
};

export function TabelaAuditoria({ registros, pagina, totalPaginas, total }: Props) {
  if (registros.length === 0) {
    return <p style={{ color: 'var(--cor-texto-secundario)', marginTop: 16 }}>Nenhum registro de auditoria encontrado.</p>;
  }

  return (
    <div>
      <p style={{ color: 'var(--cor-texto-secundario)', marginBottom: 8, fontSize: 13 }}>
        {total} {total === 1 ? 'registro' : 'registros'} — página {pagina} de {totalPaginas}
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 650 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--cor-borda)' }}>
              <th style={{ padding: '8px 12px' }}>Ação</th>
              <th style={{ padding: '8px 12px' }}>Usuário</th>
              <th style={{ padding: '8px 12px' }}>Alvo</th>
              <th style={{ padding: '8px 12px' }}>Detalhes</th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>Data</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid var(--cor-borda)' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 13 }}>{r.action}</td>
                <td style={{ padding: '8px 12px' }}>{r.usuario_nome ?? r.user_id ?? '—'}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 13 }}>{r.target ?? '—'}</td>
                <td style={{ padding: '8px 12px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.details ?? '—'}
                </td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontSize: 13 }}>
                  {new Date(r.created_at).toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
