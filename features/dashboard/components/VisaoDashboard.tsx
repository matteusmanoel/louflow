import Link from 'next/link';
import type { ReactNode } from 'react';
import { BadgeStatus } from '@/features/demandas/components/BadgeStatus';
import { BadgePrioridade } from '@/features/demandas/components/BadgePrioridade';
import type {
  CicloAberto,
  ContadoresAdministrador,
  DemandaResumo,
  EntregaAguardando,
  PendenciaAgenda,
  PostagemAgendada,
  VisaoDashboard as Visao,
} from '@/features/dashboard/consultas';
import { RelogioEdicao } from '@/features/status/components/RelogioEdicao';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader } from '@/components/ui/card';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { formatarData, formatarDataHora } from '@/lib/datas';
import { cn } from '@/lib/utils';

const DESCRICAO: Record<Visao['perfil'], string> = {
  Administrador: 'Resumo das demandas ativas, dos atrasos e das aprovações.',
  Editor: 'Suas demandas, as dos editores que você aprova e o tempo dos ciclos em aberto.',
  Influencer: 'Suas demandas, pendências de agendamento e postagens agendadas.',
};

export function descricaoDashboard(perfil: Visao['perfil']): string {
  return DESCRICAO[perfil];
}

export function VisaoDashboard({ visao }: { visao: Visao }) {
  if (visao.perfil === 'Administrador') {
    return (
      <>
        <Contadores contadores={visao.contadores} />
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <Secao titulo="Demandas atrasadas">
            <ListaDemandas itens={visao.atrasadas} vazio="Nenhuma demanda atrasada" />
          </Secao>
          <Secao titulo="Aprovações">
            <ListaDemandas itens={visao.aprovacoes} vazio="Nenhuma demanda em aprovação" />
          </Secao>
        </div>
      </>
    );
  }

  if (visao.perfil === 'Influencer') {
    return (
      <>
        <Secao titulo="Minhas demandas">
          <ListaDemandas itens={visao.demandas} vazio="Nenhuma demanda sua" />
        </Secao>
        <Secao titulo="Pendências">
          <ListaPendencias itens={visao.pendencias} />
        </Secao>
        <Secao titulo="Postagens agendadas">
          <ListaAgendamentos itens={visao.agendamentos} />
        </Secao>
      </>
    );
  }

  return (
    <>
      <Secao titulo="Demandas">
        <ListaDemandas itens={visao.demandas} vazio="Nenhuma demanda no seu escopo" />
      </Secao>
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <Secao titulo="Relógio de edição">
          <ListaCiclos itens={visao.ciclos} />
        </Secao>
        <Secao titulo="Entregas aguardando aprovação">
          <ListaEntregas itens={visao.entregas} />
        </Secao>
      </div>
    </>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-base font-semibold text-[var(--texto-forte)]">{titulo}</h2>
      {children}
    </section>
  );
}

function Contadores({ contadores }: { contadores: ContadoresAdministrador }) {
  const itens = [
    { rotulo: 'Total', valor: contadores.total, alerta: false },
    { rotulo: 'Atrasadas', valor: contadores.atrasadas, alerta: contadores.atrasadas > 0 },
    { rotulo: 'Em aprovação', valor: contadores.emAprovacao, alerta: false },
    { rotulo: 'Pendências', valor: contadores.pendencias, alerta: false },
  ];
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4" aria-label="Contadores">
      {itens.map((item) => (
        <li key={item.rotulo} className="min-w-0">
          <Card>
            <CardHeader className="gap-1 p-4">
              <CardDescription>{item.rotulo}</CardDescription>
              <p
                className={cn(
                  'fonte-numero text-2xl font-semibold tabular-nums',
                  item.alerta ? 'text-[var(--alerta-atrasada)]' : 'text-[var(--texto-forte)]',
                )}
              >
                {item.valor}
              </p>
            </CardHeader>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function ListaDemandas({ itens, vazio }: { itens: DemandaResumo[]; vazio: string }) {
  if (itens.length === 0) return <EstadoVazio titulo={vazio} className="py-4" />;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {itens.map((demanda) => (
        <li key={demanda.id}>
          <div
            className={cn(
              'flex min-w-0 flex-wrap items-center gap-2 rounded-[var(--raio-card)] border px-3 py-2',
              demanda.atrasada
                ? 'border-[var(--alerta-atrasada)] bg-[var(--linha-atrasada-fundo)]'
                : 'border-[var(--borda-app)] bg-[var(--superficie)]',
            )}
          >
            <Link
              href={`/demandas/${demanda.id}`}
              className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--texto-forte)]"
              title={demanda.titulo}
            >
              {demanda.titulo}
            </Link>
            <BadgeStatus status={demanda.status} />
            <BadgePrioridade prioridade={demanda.prioridade} />
            <span className="text-xs tabular-nums text-[var(--texto-suave)]">
              {formatarData(demanda.prazo)}
            </span>
            {demanda.editorNome && (
              <span className="max-w-full truncate text-xs text-[var(--texto-suave)]" title={demanda.editorNome}>
                {demanda.editorNome}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ListaCiclos({ itens }: { itens: CicloAberto[] }) {
  if (itens.length === 0) return <EstadoVazio titulo="Nenhum ciclo de edição aberto" className="py-4" />;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {itens.map((ciclo) => (
        <li
          key={ciclo.demandaId}
          className="flex min-w-0 flex-wrap items-center gap-2 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] px-3 py-2"
        >
          <Link
            href={`/demandas/${ciclo.demandaId}`}
            className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--texto-forte)]"
            title={ciclo.titulo}
          >
            {ciclo.titulo}
          </Link>
          {ciclo.pausado && <Badge variant="warning">Pausado</Badge>}
          <RelogioEdicao
            baseMs={ciclo.decorridoMs}
            atualizadoEmMs={ciclo.atualizadoEmMs}
            pausado={ciclo.pausado}
          />
        </li>
      ))}
    </ul>
  );
}

function ListaEntregas({ itens }: { itens: EntregaAguardando[] }) {
  if (itens.length === 0) {
    return <EstadoVazio titulo="Nenhuma entrega aguardando aprovação" className="py-4" />;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {itens.map((entrega) => (
        <li
          key={entrega.id}
          className="flex min-w-0 flex-col gap-1 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] px-3 py-2"
        >
          <Link
            href={`/demandas/${entrega.demandaId}`}
            className="truncate text-sm font-medium text-[var(--texto-forte)]"
            title={entrega.titulo}
          >
            {entrega.titulo}
          </Link>
          <p className="text-xs text-[var(--texto-suave)]">
            <span className="fonte-numero tabular-nums">Versão {entrega.versao}</span>
            {entrega.editorNome ? <span> · {entrega.editorNome}</span> : null}
            <span> · {formatarDataHora(entrega.entregueEm)}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}

function ListaPendencias({ itens }: { itens: PendenciaAgenda[] }) {
  if (itens.length === 0) return <EstadoVazio titulo="Nenhuma pendência em aberto" className="py-4" />;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {itens.map((item) => (
        <li key={item.id}>
          <Link
            href={`/demandas/${item.demandaId}`}
            className="block min-w-0 truncate rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] px-3 py-2 text-sm font-medium text-[var(--texto-forte)]"
            title={item.titulo}
          >
            {item.titulo}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ListaAgendamentos({ itens }: { itens: PostagemAgendada[] }) {
  if (itens.length === 0) return <EstadoVazio titulo="Nenhuma postagem agendada" className="py-4" />;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {itens.map((item) => (
        <li
          key={item.id}
          className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] px-3 py-2"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--texto-forte)]" title={item.titulo}>
            {item.titulo}
          </span>
          <span className="text-xs text-[var(--texto-suave)]">
            {item.plataforma} · <span className="tabular-nums">{formatarDataHora(item.quando)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
