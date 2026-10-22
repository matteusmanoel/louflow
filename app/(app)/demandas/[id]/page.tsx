import { notFound } from 'next/navigation';
import Link from 'next/link';
import { exigirModulo } from '@/lib/auth';
import { carregarDemandaPagina } from '@/features/demandas/consultas';
import {
  FichaSecao,
  StatusControle,
  EntregasSecao,
  ComentariosSecao,
  HistoricoSecao,
} from '@/features/demandas/secoes';
import { BadgePrioridade } from '@/features/demandas/components/BadgePrioridade';
import { BadgeStatus } from '@/features/demandas/components/BadgeStatus';

export const dynamic = 'force-dynamic';

function Detalhe({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  if (!valor) return null;
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--texto-suave)', fontWeight: 500, marginBottom: 2 }}>
        {rotulo}
      </div>
      <div style={{ fontSize: '0.9rem', color: 'var(--texto-forte)' }}>{valor}</div>
    </div>
  );
}

function formatarData(valor: string | null): string | null {
  if (!valor) return null;
  const [ano, mes, dia] = valor.split('-');
  return `${dia}/${mes}/${ano}`;
}

type Props = { params: Promise<{ id: string }> };

export default async function PaginaDetalhe({ params }: Props) {
  const { id } = await params;
  const usuario = await exigirModulo('demandas');

  const demanda = await carregarDemandaPagina(id);
  if (!demanda) notFound();

  const podeEditar = usuario.permissoes.editarDemandas;

  return (
    <main style={{ padding: 'var(--conteudo-padding)' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--texto-suave)', marginBottom: 4 }}>
            <Link href="/demandas" style={{ color: 'var(--loumar-700)', textDecoration: 'none' }}>
              ← Demandas
            </Link>
            <span style={{ margin: '0 6px' }}>·</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{demanda.id}</span>
          </div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: demanda.atrasada ? 'var(--alerta-atrasada)' : 'var(--texto-forte)',
              margin: 0,
            }}
          >
            {demanda.title}
          </h1>
        </div>
        {podeEditar && (
          <Link
            href={`/demandas/${demanda.id}/editar`}
            style={{
              background: 'transparent',
              color: 'var(--loumar-700)',
              border: '1px solid var(--loumar-700)',
              padding: '7px 16px',
              borderRadius: 'var(--raio-botao-neutro)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
            }}
          >
            Editar
          </Link>
        )}
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr', maxWidth: 900 }}>
        {/* Painel de dados */}
        <section
          style={{
            background: 'var(--superficie)',
            border: `1px solid ${demanda.atrasada ? 'var(--alerta-atrasada)' : 'var(--borda-app)'}`,
            borderRadius: 'var(--raio-painel)',
            boxShadow: 'var(--sombra-painel)',
            padding: '20px 24px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '14px 24px',
            }}
          >
            <Detalhe rotulo="Status" valor={<BadgeStatus status={demanda.status} />} />
            <Detalhe rotulo="Prioridade" valor={<BadgePrioridade prioridade={demanda.priority} />} />
            <Detalhe rotulo="Formato" valor={demanda.format} />
            <Detalhe
              rotulo="Editor"
              valor={demanda.editor_label ?? demanda.editor_nome ?? 'A definir'}
            />
            <Detalhe rotulo="Influencer" valor={demanda.influencer_nome} />
            <Detalhe rotulo="Aprovação" valor={formatarData(demanda.approval_date)} />
            <Detalhe rotulo="Postagem" valor={formatarData(demanda.post_date)} />
            {demanda.editorial_line && (
              <Detalhe rotulo="Linha Editorial" valor={demanda.editorial_line} />
            )}
            {demanda.source_program && (
              <Detalhe rotulo="Programa" valor={demanda.source_program} />
            )}
            {demanda.clips_count && (
              <Detalhe rotulo="Cortes" valor={`${demanda.clips_count} cortes`} />
            )}
            {demanda.link && (
              <Detalhe
                rotulo="Link"
                valor={
                  <a
                    href={demanda.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--loumar-700)' }}
                  >
                    Abrir link ↗
                  </a>
                }
              />
            )}
          </div>

          {demanda.info && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--tabela-linha-borda)',
                fontSize: '0.9rem',
                color: 'var(--texto-forte)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {demanda.info}
            </div>
          )}

          {demanda.atrasada && (
            <div
              role="alert"
              style={{
                marginTop: 14,
                padding: '8px 14px',
                background: 'var(--alerta-atrasada-fundo)',
                border: '1px solid var(--alerta-atrasada)',
                borderRadius: 'var(--raio-card)',
                color: 'var(--alerta-atrasada)',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              ⚠️ Demanda atrasada — prazo: {formatarData(demanda.prazo_efetivo)}
            </div>
          )}
        </section>

        {/* Seções reservadas das outras fatias */}
        <StatusControle demandaId={demanda.id} usuario={usuario} />
        <FichaSecao demandaId={demanda.id} usuario={usuario} />
        <EntregasSecao demandaId={demanda.id} usuario={usuario} />
        <ComentariosSecao demandaId={demanda.id} usuario={usuario} />
        <HistoricoSecao demandaId={demanda.id} usuario={usuario} />
      </div>
    </main>
  );
}
