'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Grafico, type OpcoesGrafico } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { BadgePrioridade } from '@/features/demandas/components/BadgePrioridade';
import { BadgeStatus } from '@/features/demandas/components/BadgeStatus';
import type {
  CargaEditorPainel,
  PontoDia,
  PrioridadePainel,
  SaudeOperacao,
  TempoFormato,
} from '@/features/dashboard/consultas';
import { RelogioEdicao } from '@/features/status/components/RelogioEdicao';
import { alterarStatusDemanda } from '@/features/status/actions';
import { TRANSICOES } from '@/features/status/transicoes';
import { formatarData } from '@/lib/datas';
import { mostrarFeedback } from '@/lib/toast';

export type AcoesPainel = {
  usuarioId: string;
  administrador: boolean;
  podeAlterarStatus: boolean;
  /** Editor sem alterarStatus ainda pode iniciar a própria Demanda (o servidor confere). */
  ehEditor?: boolean;
  podeAssumir: boolean;
};

type Filtro = { tipo: 'editor' | 'formato'; valor: string } | null;

function rotuloDia(dia: string): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}

function opcoesCarga(carga: CargaEditorPainel[]): OpcoesGrafico {
  return {
    tooltip: { trigger: 'axis' },
    legend: {},
    grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: carga.map((item) => item.nome) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        type: 'bar',
        name: 'No prazo',
        stack: 'carga',
        data: carga.map((item) => Math.max(0, item.abertas - item.atrasadas)),
      },
      {
        type: 'bar',
        name: 'Atrasadas',
        stack: 'carga',
        data: carga.map((item) => item.atrasadas),
      },
    ],
  };
}

function opcoesConcluidas(pontos: PontoDia[]): OpcoesGrafico {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: pontos.map((ponto) => rotuloDia(ponto.dia)) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{ type: 'line', name: 'Concluídas', data: pontos.map((ponto) => ponto.quantidade), smooth: true }],
  };
}

function opcoesFormatos(formatos: TempoFormato[]): OpcoesGrafico {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: formatos.map((item) => item.formato) },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', name: 'Horas', data: formatos.map((item) => item.horas) }],
  };
}

function AcoesRapidas({ item, acoes }: { item: PrioridadePainel; acoes: AcoesPainel }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const responsavel = item.editorId === acoes.usuarioId;
  const pode = acoes.podeAlterarStatus && (acoes.administrador || responsavel);
  const cortes = item.formato === 'Cortes';
  const comecar =
    (pode || (Boolean(acoes.ehEditor) && responsavel)) &&
    (item.status === 'Não iniciada' || item.status === 'Ajustes solicitados') &&
    TRANSICOES[item.status].includes('Em execução');
  const pausar = pode && item.status === 'Em execução' && TRANSICOES[item.status].includes('Pausada');
  const retomar = pode && item.status === 'Pausada' && TRANSICOES.Pausada.includes('Em execução');

  function mudar(novoStatus: 'Em execução' | 'Pausada') {
    iniciar(async () => {
      const resultado = await alterarStatusDemanda({ demandaId: item.id, novoStatus });
      mostrarFeedback(resultado);
      if (resultado.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {comecar && (
        <Button type="button" size="sm" disabled={pendente} onClick={() => mudar('Em execução')}>
          {item.status === 'Ajustes solicitados' ? 'Iniciar ajustes' : cortes ? 'Começar cortes' : 'Começar edição'}
        </Button>
      )}
      {item.status === 'Em execução' && !cortes && (responsavel || acoes.administrador) && (
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href={`/demandas/${item.id}`}>Enviar para aprovação</Link>
        </Button>
      )}
      {pausar && (
        <Button type="button" size="sm" variant="outline" disabled={pendente} onClick={() => mudar('Pausada')}>
          Pausar
        </Button>
      )}
      {retomar && (
        <Button type="button" size="sm" variant="outline" disabled={pendente} onClick={() => mudar('Em execução')}>
          Retomar
        </Button>
      )}
      {item.status === 'Aprovação' && (
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href={`/demandas/${item.id}`}>Ver entrega</Link>
        </Button>
      )}
    </div>
  );
}

export function GradeOperacao({
  prioridades,
  carga,
  concluidas,
  saude,
  acoes,
}: {
  prioridades: PrioridadePainel[];
  carga: CargaEditorPainel[];
  concluidas: PontoDia[];
  saude: SaudeOperacao | null;
  acoes: AcoesPainel;
}) {
  const [filtro, setFiltro] = useState<Filtro>(null);

  function alternar(tipo: 'editor' | 'formato', valor: string) {
    setFiltro((atual) => (atual?.tipo === tipo && atual.valor === valor ? null : { tipo, valor }));
  }

  const visiveis = useMemo(() => {
    if (!filtro) return prioridades;
    if (filtro.tipo === 'editor') {
      return prioridades.filter((item) => (item.editorNome ?? 'A definir') === filtro.valor);
    }
    return prioridades.filter((item) => item.formato === filtro.valor);
  }, [filtro, prioridades]);

  const somaConcluidas = concluidas.reduce((total, ponto) => total + ponto.quantidade, 0);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className={`grid min-w-0 grid-cols-1 gap-4 ${carga.length > 0 ? 'min-[981px]:grid-cols-2' : ''}`}>
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="prioridades-titulo">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="prioridades-titulo" className="text-base font-semibold text-[var(--texto-forte)]">
              Prioridades e próximos prazos
            </h2>
            {filtro && (
              <Button type="button" variant="outline" size="sm" onClick={() => setFiltro(null)}>
                Limpar filtro
              </Button>
            )}
          </div>
          {filtro && (
            <p className="text-xs text-[var(--texto-suave)]">
              Mostrando {filtro.tipo === 'editor' ? 'o editor' : 'o formato'} {filtro.valor}
            </p>
          )}
          {visiveis.length === 0 ? (
            <EstadoVazio titulo="Nenhuma pendência no momento." className="py-6" />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {visiveis.map((item) => (
                <li
                  key={item.id}
                  className="flex min-w-0 flex-col gap-2 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-3 transition-colors duration-150"
                >
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/demandas/${item.id}`}
                        className="block truncate text-sm font-medium text-[var(--texto-forte)]"
                        title={item.titulo}
                      >
                        {item.titulo}
                      </Link>
                      <p className="truncate text-xs text-[var(--texto-suave)]">
                        {item.editorNome ?? 'A definir'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.relogio && (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--texto-suave)]">
                          <RelogioEdicao
                            baseMs={item.relogio.decorridoMs}
                            atualizadoEmMs={item.relogio.atualizadoEmMs}
                            pausado={item.relogio.pausado}
                          />
                          <span>V{item.relogio.versao}</span>
                        </span>
                      )}
                      <span className="text-xs tabular-nums text-[var(--texto-suave)]">
                        {item.prazo ? formatarData(item.prazo) : 'Sem prazo'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <BadgeStatus status={item.status} />
                    <BadgePrioridade prioridade={item.prioridade} />
                  </div>
                  {(item.editorId === acoes.usuarioId || acoes.administrador) && item.ultimoAjuste && (
                    <p className="text-xs text-[var(--texto-suave)]">
                      Ajustes solicitados{item.versaoAjuste ? ` na V${item.versaoAjuste}` : ''}: {item.ultimoAjuste}
                    </p>
                  )}
                  <AcoesRapidas item={item} acoes={acoes} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {carga.length > 0 && (
          <section className="flex min-w-0 flex-col gap-3" aria-labelledby="carga-titulo">
            <h2 id="carga-titulo" className="text-base font-semibold text-[var(--texto-forte)]">
              Distribuição da equipe
            </h2>
            <Grafico
              opcoes={opcoesCarga(carga)}
              rotulo="Carga da equipe: demandas em aberto e atrasadas"
              altura={220}
              aoClicar={(nome) => alternar('editor', nome)}
            />
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {carga.map((item) => (
                <li
                  key={item.editorId}
                  className="flex min-w-0 flex-col gap-1 rounded-[var(--raio-card)] border border-[var(--borda-app)] px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <strong className="truncate text-[var(--texto-forte)]">{item.nome}</strong>
                    {item.staff && (
                      <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--texto-suave)]">
                        Staff
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-[var(--texto-suave)]">
                    {item.abertas} {item.abertas === 1 ? 'demanda em andamento' : 'demandas em andamento'}
                    {' · '}
                    {item.cortesEmAndamento}{' '}
                    {item.cortesEmAndamento === 1 ? 'corte em andamento' : 'cortes em andamento'}
                    {' · '}
                    {item.atrasadas} {item.atrasadas === 1 ? 'atrasada' : 'atrasadas'}
                    {' · '}
                    Média de entrega:{' '}
                    {item.tempoMedioHoras == null ? 'sem histórico' : `${item.tempoMedioHoras} h`}
                  </span>
                  <span className="text-xs font-medium text-[var(--texto-forte)]">{item.disponibilidade}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {concluidas.length > 0 && (
        <section className="min-w-0" aria-labelledby="concluidas-titulo">
          <h2 id="concluidas-titulo" className="mb-3 text-base font-semibold text-[var(--texto-forte)]">
            Concluídas nos últimos 14 dias
          </h2>
          <Grafico
            opcoes={opcoesConcluidas(concluidas)}
            rotulo="Demandas concluídas nos últimos 14 dias"
            altura={220}
            vazio={somaConcluidas === 0}
            mensagemVazio="Nenhuma demanda concluída nos últimos 14 dias."
          />
        </section>
      )}

      {saude && (
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="saude-titulo">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--texto-suave)]">
              Saúde da operação
            </p>
            <h2 id="saude-titulo" className="text-base font-semibold text-[var(--texto-forte)]">
              Indicadores operacionais
            </h2>
          </div>
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 min-[981px]:grid-cols-4">
            {[
              ['Demandas paradas', saude.paradas],
              ['Editores sobrecarregados', saude.editoresSobrecarregados],
              ['Aprovações +24h', saude.aprovacoes24h],
              ['Ajustes recorrentes', saude.ajustesRecorrentes],
            ].map(([rotulo, valor]) => (
              <li
                key={String(rotulo)}
                className="rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-3"
              >
                <p className="text-xs text-[var(--texto-suave)]">{rotulo}</p>
                <p className="fonte-numero text-xl font-semibold tabular-nums text-[var(--texto-forte)]">{valor}</p>
              </li>
            ))}
          </ul>
          <div className="grid min-w-0 grid-cols-1 gap-4 min-[981px]:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--texto-forte)]">Pontos de atenção</h3>
              {saude.alertas.length === 0 ? (
                <EstadoVazio titulo="Nenhum ponto crítico agora." className="py-4" />
              ) : (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {saude.alertas.map((alerta) => (
                    <li key={`${alerta.tipo}-${alerta.id}`}>
                      <Link
                        href={`/demandas/${alerta.id}`}
                        className="flex min-w-0 flex-col rounded-[var(--raio-card)] border border-[var(--borda-app)] px-3 py-2 transition-colors duration-150"
                      >
                        <span className="truncate text-sm font-medium text-[var(--texto-forte)]">{alerta.titulo}</span>
                        <span className="text-xs text-[var(--texto-suave)]">{alerta.tipo}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-[var(--texto-forte)]">Tempo médio por formato</h3>
              <Grafico
                opcoes={opcoesFormatos(saude.formatos)}
                rotulo="Tempo médio de edição por formato, em horas"
                altura={220}
                vazio={saude.formatos.length === 0}
                mensagemVazio="Sem histórico suficiente."
                aoClicar={(nome) => alternar('formato', nome)}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
