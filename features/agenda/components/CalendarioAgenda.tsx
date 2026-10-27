'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import type { DemandaAgenda } from '../consultas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import type { BadgeVariant } from '@/components/ui/badge';
import { formatarData } from '@/lib/datas';
import { cn } from '@/lib/utils';

type Props = {
  mes: number;
  ano: number;
  demandas: DemandaAgenda[];
  diaSelecionado?: number;
  podeGerenciar?: boolean;
};

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_VARIANTE: Record<string, string> = {
  'Não iniciada':        'leitura',
  'Em execução':         'prioridade-normal',
  'Pausada':             'prioridade-alta',
  'Aprovação':           'aprovacao',
  'Ajustes solicitados': 'prioridade-urgente',
  'Concluída':           'secondary',
  'Reprovada':           'prioridade-urgente',
  'Cancelada':           'leitura',
};

function frasePostagens(qtd: number): string {
  return qtd === 1 ? '1 postagem' : `${qtd} postagens`;
}

export function CalendarioAgenda({ mes, ano, demandas, diaSelecionado }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const chaveMes = `${ano}-${mes}`;
  const diaInicial = diaSelecionado && diaSelecionado >= 1 && diaSelecionado <= 31 ? diaSelecionado : undefined;
  const [painel, setPainel] = useState<{ chave: string; dia?: number }>({
    chave: chaveMes,
    dia: diaInicial,
  });
  if (painel.chave !== chaveMes) {
    setPainel({ chave: chaveMes });
  }
  const diaAberto = painel.chave === chaveMes ? painel.dia : undefined;

  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia = new Date(ano, mes, 0);
  const offsetInicio = primeiroDia.getDay();

  const porDia = new Map<number, DemandaAgenda[]>();
  for (const d of demandas) {
    const diaNum = new Date(d.postDate).getUTCDate();
    if (!porDia.has(diaNum)) porDia.set(diaNum, []);
    porDia.get(diaNum)!.push(d);
  }

  function navegarMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes < 1) { novoMes = 12; novoAno -= 1; }
    if (novoMes > 12) { novoMes = 1; novoAno += 1; }
    const p = new URLSearchParams(params.toString());
    p.set('mes', String(novoMes));
    p.set('ano', String(novoAno));
    p.delete('dia');
    router.push(`${pathname}?${p.toString()}`);
  }

  function selecionarDia(dia: number) {
    setPainel({ chave: chaveMes, dia });
  }

  const demandasDia = diaAberto ? (porDia.get(diaAberto) ?? []) : [];
  const hoje = new Date();
  const ehMesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes;
  const diaAtual = ehMesAtual ? hoje.getDate() : -1;

  const celulas: (number | null)[] = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: ultimoDia.getDate() }, (_, i) => i + 1),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

  const dataPainel = diaAberto
    ? formatarData(`${ano}-${String(mes).padStart(2, '0')}-${String(diaAberto).padStart(2, '0')}`)
    : null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navegarMes(-1)}
          aria-label="Mês anterior"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <h2 className="flex-1 text-center text-base font-semibold text-[var(--texto-forte)]">
          {NOMES_MESES[mes - 1]} {ano}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navegarMes(+1)}
          aria-label="Próximo mês"
          type="button"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div
        className="grid w-full grid-cols-7 gap-1"
        role="grid"
        aria-label={`Calendário de ${NOMES_MESES[mes - 1]} ${ano}`}
      >
        {NOMES_DIAS.map((nome) => (
          <div
            key={nome}
            className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-widest text-[var(--texto-suave)]"
          >
            {nome}
          </div>
        ))}

        {celulas.map((dia, idx) => {
          if (dia === null) {
            return (
              <div
                key={`vazio-${idx}`}
                className="min-h-[72px]"
                role="gridcell"
                aria-hidden
              />
            );
          }

          const qtd = porDia.get(dia)?.length ?? 0;
          const selecionado = dia === diaAberto;
          const ehHoje = dia === diaAtual;

          return (
            <button
              key={dia}
              type="button"
              role="gridcell"
              onClick={() => selecionarDia(dia)}
              aria-label={
                qtd > 0
                  ? `${dia} de ${NOMES_MESES[mes - 1]}, ${frasePostagens(qtd)}`
                  : `${dia} de ${NOMES_MESES[mes - 1]}`
              }
              aria-selected={selecionado}
              className={cn(
                'flex min-h-[72px] w-full flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors',
                selecionado
                  ? 'border-[var(--loumar-700)] bg-[var(--loumar-50)]'
                  : 'border-[var(--borda-app)] bg-[var(--superficie)] hover:border-[var(--loumar-600)]',
              )}
            >
              <span
                className={cn(
                  'fonte-numero inline-flex h-6 w-6 items-center justify-center rounded-full text-sm',
                  ehHoje
                    ? 'bg-[var(--loumar-700)] font-bold text-[var(--branco)]'
                    : 'text-[var(--texto-forte)]',
                )}
              >
                {dia}
              </span>
              {qtd > 0 && (
                <span className="fonte-numero self-start rounded-full bg-[var(--loumar-700)] px-1.5 py-px text-[10px] font-semibold text-[var(--branco)]">
                  {qtd}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {diaAberto != null && dataPainel && (
        <div className="flex min-w-0 flex-col gap-3">
          <h3 className="m-0 text-base font-medium text-[var(--texto-forte)]">
            {demandasDia.length === 0 ? 'Nenhuma postagem' : frasePostagens(demandasDia.length)} em {dataPainel}
          </h3>
          {demandasDia.length === 0 ? (
            <EstadoVazio
              icone={CalendarDays}
              titulo="Nenhuma postagem"
              descricao="Não há demandas agendadas para este dia."
              className="py-8"
            />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {demandasDia.map((d) => (
                <li key={d.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-1.5 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="fonte-titulo font-semibold text-[var(--texto-forte)]">{d.titulo}</span>
                        <Badge variant={(STATUS_VARIANTE[d.status] ?? 'default') as BadgeVariant}>
                          {d.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-[var(--texto-suave)]">
                        <span>#{d.id}</span>
                        <span>{d.formato}</span>
                        {d.influencerNome && <span>Influencer: {d.influencerNome}</span>}
                        {d.editorNome && <span>Editor: {d.editorNome}</span>}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
