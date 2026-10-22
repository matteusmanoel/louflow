'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { DemandaAgenda } from '../consultas';
import { BadgeStatus } from '@/components/ui';
import type { Status } from '@/components/ui';

type Props = {
  mes: number;
  ano: number;
  demandas: DemandaAgenda[];
  diaSelecionado?: number;
  /** Reservado para ações futuras (agendar/cancelar diretamente no calendário). */
  podeGerenciar?: boolean;
};

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const NOMES_DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CalendarioAgenda({ mes, ano, demandas, diaSelecionado }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const primeiroDia = new Date(ano, mes - 1, 1);
  const ultimoDia = new Date(ano, mes, 0);
  const offsetInicio = primeiroDia.getDay(); // 0 = Dom

  // Índice de demandas por dia
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
    const p = new URLSearchParams(params.toString());
    p.set('dia', String(dia));
    router.push(`${pathname}?${p.toString()}`);
  }

  const demandasDia = diaSelecionado ? (porDia.get(diaSelecionado) ?? []) : [];
  const hoje = new Date();
  const ehMesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes;
  const diaAtual = ehMesAtual ? hoje.getDate() : -1;

  const celulas: (number | null)[] = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: ultimoDia.getDate() }, (_, i) => i + 1),
  ];
  // Completar até múltiplo de 7
  while (celulas.length % 7 !== 0) celulas.push(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Cabeçalho de navegação */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => navegarMes(-1)}
          style={{
            background: 'none', border: '1px solid var(--color-borda)', borderRadius: 6,
            padding: '4px 12px', cursor: 'pointer', color: 'var(--color-texto)',
          }}
          aria-label="Mês anterior"
        >
          ‹
        </button>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, flex: 1, textAlign: 'center', color: 'var(--color-texto)' }}>
          {NOMES_MESES[mes - 1]} {ano}
        </h2>
        <button
          onClick={() => navegarMes(+1)}
          style={{
            background: 'none', border: '1px solid var(--color-borda)', borderRadius: 6,
            padding: '4px 12px', cursor: 'pointer', color: 'var(--color-texto)',
          }}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>

      {/* Grade do calendário */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          minWidth: 0,
        }}
        role="grid"
        aria-label={`Calendário de ${NOMES_MESES[mes - 1]} ${ano}`}
      >
        {NOMES_DIAS.map((nome) => (
          <div
            key={nome}
            style={{
              textAlign: 'center', padding: '6px 0',
              fontSize: '0.75rem', fontWeight: 600,
              color: 'var(--color-texto-suave)',
              textTransform: 'uppercase',
            }}
          >
            {nome}
          </div>
        ))}

        {celulas.map((dia, idx) => {
          if (dia === null) {
            return <div key={`vazio-${idx}`} style={{ minHeight: 72 }} role="gridcell" aria-hidden />;
          }
          const qtd = porDia.get(dia)?.length ?? 0;
          const selecionado = dia === diaSelecionado;
          const ehHoje = dia === diaAtual;

          return (
            <button
              key={dia}
              role="gridcell"
              onClick={() => selecionarDia(dia)}
              aria-label={`${dia} de ${NOMES_MESES[mes - 1]}${qtd > 0 ? `, ${qtd} postagem${qtd > 1 ? 's' : ''}` : ''}`}
              aria-selected={selecionado}
              style={{
                minHeight: 72,
                padding: '6px 4px',
                border: selecionado
                  ? '2px solid var(--color-primaria)'
                  : '1px solid var(--color-borda)',
                borderRadius: 8,
                background: selecionado
                  ? 'var(--color-primaria-suave, color-mix(in srgb, var(--color-primaria) 12%, transparent))'
                  : 'var(--color-cartao)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                transition: 'border-color 0.15s',
              }}
            >
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: '50%',
                  background: ehHoje ? 'var(--color-primaria)' : 'transparent',
                  color: ehHoje ? '#fff' : 'var(--color-texto)',
                  fontWeight: ehHoje ? 700 : 400,
                  fontSize: '0.875rem',
                }}
              >
                {dia}
              </span>
              {qtd > 0 && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    background: 'var(--color-primaria)',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '1px 6px',
                    fontWeight: 600,
                    alignSelf: 'flex-start',
                  }}
                >
                  {qtd}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Painel de detalhes do dia selecionado */}
      {diaSelecionado && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: '1rem', color: 'var(--color-texto)' }}>
            Postagens em {diaSelecionado}/{String(mes).padStart(2, '0')}/{ano}
          </h3>
          {demandasDia.length === 0 ? (
            <p style={{ color: 'var(--color-texto-suave)', fontSize: '0.875rem' }}>
              Nenhuma postagem neste dia.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {demandasDia.map((d) => (
                <li
                  key={d.id}
                  style={{
                    border: '1px solid var(--color-borda)', borderRadius: 8,
                    padding: '10px 14px', background: 'var(--color-cartao)',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-texto)' }}>
                      {d.titulo}
                    </span>
                    <BadgeStatus status={d.status as Status} />
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-suave)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>#{d.id}</span>
                    <span>{d.formato}</span>
                    {d.influencerNome && <span>Influencer: {d.influencerNome}</span>}
                    {d.editorNome && <span>Editor: {d.editorNome}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
