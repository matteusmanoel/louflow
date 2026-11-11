import Link from 'next/link';
import type { ReactNode } from 'react';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import type {
  AlertaPrazo,
  EntregaAguardando,
  NivelPrazo,
  PendenciaAgenda,
  PostagemAgendada,
  VisaoDashboard as Visao,
} from '@/features/dashboard/consultas';
import { formatarData, formatarDataHora } from '@/lib/datas';
import { FilaCompartilhada } from './FilaCompartilhada';
import { GradeOperacao, type AcoesPainel } from './GradeOperacao';
import { Indicadores } from './Indicadores';

const DESCRICAO: Record<Visao['perfil'], string> = {
  Administrador: 'Prazos, carga da equipe e saúde da operação.',
  Editor: 'Sua fila, as demandas disponíveis e o tempo dos ciclos em aberto.',
  Influencer: 'Seus conteúdos, pendências de agendamento e postagens.',
};

const FAIXA: Record<NivelPrazo, string> = {
  atrasada: 'border-l-[var(--alerta-atrasada)] bg-[var(--alerta-atrasada-fundo)]',
  hoje: 'border-l-[var(--alerta-hoje)] bg-[var(--alerta-hoje-fundo)]',
  amanha: 'border-l-[var(--alerta-amanha)] bg-[var(--alerta-amanha-fundo)]',
  'dois-dias': 'border-l-[var(--alerta-2dias)] bg-[var(--alerta-2dias-fundo)]',
};

const TEXTO_FAIXA: Record<NivelPrazo, string> = {
  atrasada: 'text-[var(--alerta-atrasada)]',
  hoje: 'text-[var(--alerta-hoje)]',
  amanha: 'text-[var(--alerta-amanha)]',
  'dois-dias': 'text-[var(--alerta-2dias)]',
};

export function descricaoDashboard(perfil: Visao['perfil']): string {
  return DESCRICAO[perfil];
}

export function VisaoDashboard({ visao, acoes }: { visao: Visao; acoes: AcoesPainel }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Indicadores itens={visao.indicadores} />
      <AlertasPrazo itens={visao.alertasPrazo} perfil={visao.perfil} />
      <GradeOperacao
        prioridades={visao.prioridades}
        carga={visao.perfil === 'Administrador' ? visao.carga : []}
        concluidas={visao.perfil === 'Administrador' ? visao.concluidas14 : []}
        saude={visao.perfil === 'Administrador' ? visao.saude : null}
        acoes={acoes}
      />
      {visao.perfil === 'Editor' && (
        <FilaCompartilhada itens={visao.fila} ocupadas={visao.ocupadas} podeAssumir={acoes.podeAssumir} />
      )}
      {visao.perfil === 'Editor' && visao.entregas.length > 0 && (
        <Secao titulo="Entregas aguardando aprovação">
          <ListaEntregas itens={visao.entregas} />
        </Secao>
      )}
      {visao.perfil === 'Influencer' && (
        <>
          <Secao titulo="Pendências">
            <ListaPendencias itens={visao.pendencias} />
          </Secao>
          <Secao titulo="Postagens agendadas">
            <ListaAgendamentos itens={visao.agendamentos} />
          </Secao>
        </>
      )}
    </div>
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

function AlertasPrazo({ itens, perfil }: { itens: AlertaPrazo[]; perfil: Visao['perfil'] }) {
  if (itens.length === 0) return null;
  const atrasadas = itens.filter((item) => item.diasParaPrazo < 0).length;
  const proximas = itens.length - atrasadas;
  const titulo =
    perfil === 'Administrador'
      ? 'Prazos da equipe que exigem atenção'
      : perfil === 'Editor'
        ? 'Seus prazos que exigem atenção'
        : 'Prazos dos seus conteúdos que exigem atenção';
  const resumo = [
    atrasadas > 0 ? `${atrasadas} ${atrasadas === 1 ? 'demanda atrasada' : 'demandas atrasadas'}` : '',
    proximas > 0
      ? `${proximas} ${proximas === 1 ? 'demanda vence em até 2 dias' : 'demandas vencem em até 2 dias'}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-labelledby="alertas-prazo-titulo" aria-live="polite">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--texto-suave)]">
          Atenção aos prazos
        </p>
        <h2 id="alertas-prazo-titulo" className="text-base font-semibold text-[var(--texto-forte)]">
          {titulo}
        </h2>
        <p className="text-sm text-[var(--texto-suave)]">{resumo}</p>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {itens.map((item) => (
          <li key={item.id}>
            <Link
              href={`/demandas/${item.id}`}
              title={`Abrir demanda ${item.titulo}`}
              className={`flex min-w-0 flex-col gap-1 rounded-[var(--raio-card)] border border-[var(--borda-app)] border-l-[5px] px-3 py-2 transition-colors duration-150 sm:flex-row sm:items-center sm:justify-between ${FAIXA[item.nivel]}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[var(--texto-forte)]">{item.titulo}</span>
                <span className="block truncate text-xs text-[var(--texto-suave)]">
                  {item.editorNome ? `Editor: ${item.editorNome}` : 'Editor ainda não definido'}
                  {' · '}
                  {item.status}
                </span>
              </span>
              <span className="text-right">
                <span className={`block text-xs font-extrabold uppercase ${TEXTO_FAIXA[item.nivel]}`}>
                  {item.textoPrazo}
                </span>
                <span className="block text-xs tabular-nums text-[var(--texto-suave)]">
                  Prazo: {formatarData(item.prazo)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
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
