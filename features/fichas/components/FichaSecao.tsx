import type { PropsSecaoDemanda } from '@/features/demandas/secoes';
import { obterFichaTecnicaDb } from '@/features/fichas/consultas';
import { FormFichaTecnica } from './FormFichaTecnica';

/**
 * Seção reservada do detalhe da Demanda: Ficha Técnica da Demanda.
 * Dona: S1-11 (#11566). Assinatura fixa — o detalhe (S1-02) a compõe sem conhecer a implementação.
 */
export async function FichaSecao({ demandaId, usuario }: PropsSecaoDemanda) {
  const ficha = await obterFichaTecnicaDb(demandaId);
  const podeEditar = usuario.permissoes.editarDemandas;

  return (
    <section
      style={{
        background: 'var(--superficie)',
        border: '1px solid var(--borda-app)',
        borderRadius: 'var(--raio-painel)',
        boxShadow: 'var(--sombra-painel)',
        padding: '20px 24px',
      }}
    >
      <h2
        style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--texto-forte)',
          margin: '0 0 16px',
        }}
      >
        Ficha Técnica
      </h2>

      {!ficha && !podeEditar && (
        <p style={{ color: 'var(--texto-suave)', fontSize: '0.875rem', margin: 0 }}>
          Nenhuma ficha técnica registrada.
        </p>
      )}

      {ficha && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '12px 24px',
            marginBottom: podeEditar ? 24 : 0,
          }}
        >
          {ficha.formato && (
            <Detalhe rotulo="Formato" valor={ficha.formato} />
          )}
          {ficha.duracaoSegundos != null && (
            <Detalhe rotulo="Duração" valor={formatarDuracao(ficha.duracaoSegundos)} />
          )}
          {ficha.plataformas.length > 0 && (
            <Detalhe rotulo="Plataformas" valor={ficha.plataformas.join(', ')} />
          )}
          {ficha.briefing && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--texto-suave)',
                  marginBottom: 4,
                }}
              >
                Briefing
              </div>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--texto-forte)',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {ficha.briefing}
              </p>
            </div>
          )}
          {ficha.observacoesTecnicas && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: 'var(--texto-suave)',
                  marginBottom: 4,
                }}
              >
                Observações Técnicas
              </div>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--texto-forte)',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {ficha.observacoesTecnicas}
              </p>
            </div>
          )}
        </div>
      )}

      {podeEditar && (
        <div
          style={
            ficha
              ? { borderTop: '1px solid var(--tabela-linha-borda)', paddingTop: 20 }
              : {}
          }
        >
          {ficha && (
            <p
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--texto-suave)',
                margin: '0 0 14px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Editar Ficha Técnica
            </p>
          )}
          <FormFichaTecnica demandaId={demandaId} ficha={ficha} />
        </div>
      )}
    </section>
  );
}

// ---- helpers ----------------------------------------------------------------

function Detalhe({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <div
        style={{
          fontSize: '0.75rem',
          fontWeight: 500,
          color: 'var(--texto-suave)',
          marginBottom: 2,
        }}
      >
        {rotulo}
      </div>
      <div style={{ fontSize: '0.9rem', color: 'var(--texto-forte)' }}>{valor}</div>
    </div>
  );
}

function formatarDuracao(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
