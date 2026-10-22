'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import type { Demanda, FiltrosListarDemandas, ResumoEditor } from '../consultas';
import { CardDemanda } from './CardDemanda';

const INTERVALO_POLLING_MS = 30_000;

type Props = {
  demandasIniciais: Demanda[];
  resumoEditores: ResumoEditor[];
  /** Server action que recarrega as demandas com filtros atuais. */
  buscarDemandas: (filtros: FiltrosListarDemandas) => Promise<Demanda[]>;
  revisaoInicial: number;
  podeCriar: boolean;
};

export function QuadroDemandas({
  demandasIniciais,
  resumoEditores,
  buscarDemandas,
  revisaoInicial,
  podeCriar,
}: Props) {
  const [demandas, setDemandas] = useState<Demanda[]>(demandasIniciais);
  const [filtros, setFiltros] = useState<FiltrosListarDemandas>({});
  const [busca, setBusca] = useState('');
  const [editorFiltro, setEditorFiltro] = useState('');
  const [periodoinicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const revisaoRef = useRef(revisaoInicial);
  const [, startTransition] = useTransition();

  const recarregar = useCallback(
    async (novosFiltros: FiltrosListarDemandas) => {
      startTransition(async () => {
        const lista = await buscarDemandas(novosFiltros);
        setDemandas(lista);
      });
    },
    [buscarDemandas],
  );

  // Polling: verifica revisão a cada 30s
  useEffect(() => {
    const controller = new AbortController();
    const intervalo = setInterval(async () => {
      try {
        const resp = await fetch(`/api/sync?desde=${revisaoRef.current}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!resp.ok) return;
        const { alterou, revisao } = (await resp.json()) as { alterou: boolean; revisao: number };
        if (alterou) {
          revisaoRef.current = revisao;
          await recarregar(filtros);
        }
      } catch {
        // falha silenciosa: rede ou abort
      }
    }, INTERVALO_POLLING_MS);

    return () => {
      clearInterval(intervalo);
      controller.abort();
    };
  }, [filtros, recarregar]);

  function aplicarFiltros() {
    const novosFiltros: FiltrosListarDemandas = {
      busca: busca || undefined,
      editor_id: editorFiltro || undefined,
      periodo:
        periodoinicio && periodoFim
          ? { inicio: periodoinicio, fim: periodoFim }
          : undefined,
    };
    setFiltros(novosFiltros);
    void recarregar(novosFiltros);
  }

  function limparFiltros() {
    setBusca('');
    setEditorFiltro('');
    setPeriodoInicio('');
    setPeriodoFim('');
    setFiltros({});
    void recarregar({});
  }

  const editoresUnicos = resumoEditores;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Barra de filtros */}
      <div
        style={{
          background: 'var(--superficie)',
          border: '1px solid var(--borda-app)',
          borderRadius: 'var(--raio-painel)',
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 200px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-suave)', fontWeight: 500 }}>Buscar</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
            placeholder="Título..."
            style={{
              border: '1px solid var(--borda-app)',
              borderRadius: 'var(--raio-input)',
              padding: '7px 10px',
              fontSize: '0.875rem',
            }}
          />
        </label>

        {editoresUnicos.length > 0 && (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 160px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--texto-suave)', fontWeight: 500 }}>Editor</span>
            <select
              value={editorFiltro}
              onChange={(e) => setEditorFiltro(e.target.value)}
              style={{
                border: '1px solid var(--borda-app)',
                borderRadius: 'var(--raio-input)',
                padding: '7px 10px',
                fontSize: '0.875rem',
                background: 'var(--superficie)',
              }}
            >
              <option value="">Todos</option>
              {editoresUnicos.map((e) => (
                <option key={e.editor_id} value={e.editor_id}>
                  {e.editor_label ?? e.editor_nome}
                </option>
              ))}
            </select>
          </label>
        )}

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-suave)', fontWeight: 500 }}>De</span>
          <input
            type="date"
            value={periodoinicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            style={{
              border: '1px solid var(--borda-app)',
              borderRadius: 'var(--raio-input)',
              padding: '7px 10px',
              fontSize: '0.875rem',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--texto-suave)', fontWeight: 500 }}>Até</span>
          <input
            type="date"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            style={{
              border: '1px solid var(--borda-app)',
              borderRadius: 'var(--raio-input)',
              padding: '7px 10px',
              fontSize: '0.875rem',
            }}
          />
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={aplicarFiltros}
            style={{
              background: 'var(--loumar-700)',
              color: 'var(--branco)',
              border: 'none',
              borderRadius: 'var(--raio-botao)',
              padding: '8px 16px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Filtrar
          </button>
          <button
            type="button"
            onClick={limparFiltros}
            style={{
              background: 'transparent',
              color: 'var(--texto-suave)',
              border: '1px solid var(--borda-app)',
              borderRadius: 'var(--raio-botao-neutro)',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Resumo por Editor */}
      {editoresUnicos.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            background: 'var(--tabela-cabecalho-fundo)',
            borderRadius: 'var(--raio-card)',
            padding: '12px 16px',
            border: '1px solid var(--tabela-cabecalho-borda)',
          }}
        >
          {editoresUnicos.map((e) => (
            <div
              key={e.editor_id}
              style={{
                fontSize: '0.8rem',
                background: 'var(--superficie)',
                borderRadius: 'var(--raio-card)',
                padding: '8px 12px',
                border: '1px solid var(--borda-app)',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--texto-forte)' }}>
                {e.editor_label ?? e.editor_nome}
              </div>
              <div style={{ color: 'var(--texto-suave)', marginTop: 2 }}>
                {e.total} total · {e.em_execucao} em exec. · {e.concluidas} conc.
                {e.atrasadas > 0 && (
                  <span style={{ color: 'var(--alerta-atrasada)', fontWeight: 600 }}>
                    {' '}· {e.atrasadas} atras.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de Demandas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {demandas.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--texto-suave)',
              padding: '40px 20px',
              background: 'var(--superficie)',
              borderRadius: 'var(--raio-card)',
              border: '1px solid var(--borda-app)',
            }}
          >
            Nenhuma demanda encontrada.
            {podeCriar && (
              <div style={{ marginTop: 12 }}>
                <Link
                  href="/demandas/nova"
                  style={{
                    color: 'var(--loumar-700)',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  + Criar demanda
                </Link>
              </div>
            )}
          </div>
        ) : (
          demandas.map((d) => <CardDemanda key={d.id} demanda={d} />)
        )}
      </div>
    </div>
  );
}
