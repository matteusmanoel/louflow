import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { exigirModulo } from '@/lib/auth';
import { formatarData } from '@/lib/datas';
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
import { Button } from '@/components/ui/button';
import { PainelEntidade, type AbaPainel } from '@/components/ui/painel-entidade';
import { cn } from '@/lib/utils';

const ABAS: AbaPainel[] = [
  { id: 'detalhes', rotulo: 'Detalhes' },
  { id: 'entregas', rotulo: 'Entregas' },
  { id: 'comentarios', rotulo: 'Comentários' },
  { id: 'historico', rotulo: 'Histórico' },
];

function abaValida(valor: string | undefined): string {
  return ABAS.some((aba) => aba.id === valor) ? valor! : 'detalhes';
}

function Detalhe({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  if (!valor) return null;
  return (
    <div>
      <div className="mb-0.5 text-xs font-medium text-[var(--texto-suave)]">{rotulo}</div>
      <div className="text-sm text-[var(--texto-forte)]">{valor}</div>
    </div>
  );
}

function dataOuNada(valor: string | null): string | null {
  return valor ? formatarData(valor) : null;
}

export async function VistaDemanda({
  id,
  variante,
  aba,
}: {
  id: string;
  variante: 'pagina' | 'modal';
  aba?: string;
}) {
  const usuario = await exigirModulo('demandas');
  const demanda = await carregarDemandaPagina(id);
  if (!demanda) notFound();

  const abaAtiva = abaValida(aba);
  const podeEditar = usuario.permissoes.editarDemandas;

  return (
    <PainelEntidade
      variante={variante}
      titulo={demanda.title}
      grupo="Produção"
      abas={ABAS}
      abaAtiva={abaAtiva}
      destinoFechar={variante === 'pagina' ? '/demandas' : undefined}
      acao={
        podeEditar ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/demandas/${demanda.id}/editar`}>Editar</Link>
          </Button>
        ) : undefined
      }
    >
      {abaAtiva === 'detalhes' && (
        <div className="flex flex-col gap-4">
          <p className="font-mono text-xs text-[var(--texto-suave)]">{demanda.id}</p>
          <section
            className={cn(
              'rounded-[var(--raio-painel)] border bg-[var(--superficie)] p-5 shadow-[var(--sombra-painel)]',
              demanda.atrasada ? 'border-[var(--alerta-atrasada)]' : 'border-[var(--borda-app)]',
            )}
          >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-6 gap-y-3.5">
              <Detalhe rotulo="Status" valor={<BadgeStatus status={demanda.status} />} />
              <Detalhe rotulo="Prioridade" valor={<BadgePrioridade prioridade={demanda.priority} />} />
              <Detalhe rotulo="Formato" valor={demanda.format} />
              <Detalhe rotulo="Editor" valor={demanda.editor_label ?? demanda.editor_nome ?? 'A definir'} />
              <Detalhe rotulo="Influencer" valor={demanda.influencer_nome} />
              <Detalhe rotulo="Aprovação" valor={dataOuNada(demanda.approval_date)} />
              <Detalhe rotulo="Postagem" valor={dataOuNada(demanda.post_date)} />
              {demanda.editorial_line && <Detalhe rotulo="Linha Editorial" valor={demanda.editorial_line} />}
              {demanda.source_program && <Detalhe rotulo="Programa" valor={demanda.source_program} />}
              {demanda.clips_count && <Detalhe rotulo="Cortes" valor={`${demanda.clips_count} cortes`} />}
              {demanda.link && (
                <Detalhe
                  rotulo="Link"
                  valor={
                    <a href={demanda.link} target="_blank" rel="noopener noreferrer">
                      Abrir link
                    </a>
                  }
                />
              )}
            </div>
            {demanda.info && (
              <div className="mt-4 whitespace-pre-wrap border-t border-[var(--tabela-linha-borda)] pt-4 text-sm text-[var(--texto-forte)]">
                {demanda.info}
              </div>
            )}
            {demanda.atrasada && (
              <div
                role="alert"
                className="mt-3.5 flex items-center gap-2 rounded-[var(--raio-card)] border border-[var(--alerta-atrasada)] bg-[var(--alerta-atrasada-fundo)] px-3.5 py-2 text-sm font-semibold text-[var(--alerta-atrasada)]"
              >
                <AlertTriangle className="h-4 w-4" aria-hidden />
                Demanda atrasada — prazo: {formatarData(demanda.prazo_efetivo)}
              </div>
            )}
          </section>
          <StatusControle demandaId={demanda.id} usuario={usuario} />
          <FichaSecao demandaId={demanda.id} usuario={usuario} />
        </div>
      )}
      {abaAtiva === 'entregas' && <EntregasSecao demandaId={demanda.id} usuario={usuario} />}
      {abaAtiva === 'comentarios' && <ComentariosSecao demandaId={demanda.id} usuario={usuario} />}
      {abaAtiva === 'historico' && <HistoricoSecao demandaId={demanda.id} usuario={usuario} />}
    </PainelEntidade>
  );
}
