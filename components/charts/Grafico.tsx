'use client';

import { useEffect, useRef } from 'react';
import { BarChart3 } from 'lucide-react';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { cn } from '@/lib/utils';
import { echarts, type OpcoesGrafico } from './echarts';
import { criarTemaLoumar } from './tema-loumar';

interface GraficoProps {
  opcoes: OpcoesGrafico;
  /** Descrição do gráfico para leitores de tela (vira aria-label e a descrição do módulo aria). */
  rotulo: string;
  /** Altura em px; a largura acompanha o contêiner. */
  altura?: number;
  /** Quando true, exibe o EstadoVazio em vez do gráfico. */
  vazio?: boolean;
  mensagemVazio?: string;
  className?: string;
}

function prefereMenosMovimento(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function seriesVazias(opcoes: OpcoesGrafico): boolean {
  const { series, dataset } = opcoes;
  if (dataset) return false;
  if (!series) return true;
  const lista = Array.isArray(series) ? series : [series];
  return lista.every((s) => !Array.isArray(s.data) || s.data.length === 0);
}

export function Grafico({
  opcoes,
  rotulo,
  altura = 280,
  vazio,
  mensagemVazio = 'Sem dados para exibir.',
  className,
}: GraficoProps) {
  const conteinerRef = useRef<HTMLDivElement>(null);
  const instanciaRef = useRef<echarts.ECharts | null>(null);
  const opcoesRef = useRef(opcoes);
  const semDados = vazio ?? seriesVazias(opcoes);

  const aplicarOpcoes = (instancia: echarts.ECharts) => {
    instancia.setOption(
      {
        animation: !prefereMenosMovimento(),
        aria: { enabled: true, label: { description: rotulo } },
        ...opcoesRef.current,
      },
      { notMerge: true },
    );
  };

  useEffect(() => {
    const elemento = conteinerRef.current;
    if (semDados || !elemento) return;

    const iniciar = () => {
      instanciaRef.current?.dispose();
      const instancia = echarts.init(elemento, criarTemaLoumar(), { renderer: 'canvas' });
      instanciaRef.current = instancia;
      aplicarOpcoes(instancia);
    };
    iniciar();

    const observadorTamanho = new ResizeObserver(() => instanciaRef.current?.resize());
    observadorTamanho.observe(elemento);

    const observadorTema = new MutationObserver(iniciar);
    observadorTema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] });

    return () => {
      observadorTamanho.disconnect();
      observadorTema.disconnect();
      instanciaRef.current?.dispose();
      instanciaRef.current = null;
    };
    // aplicarOpcoes lê de refs; reiniciar só quando o gráfico aparece/some.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semDados]);

  useEffect(() => {
    opcoesRef.current = opcoes;
    if (instanciaRef.current) aplicarOpcoes(instanciaRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opcoes, rotulo]);

  if (semDados) {
    return <EstadoVazio icone={BarChart3} titulo={mensagemVazio} className={cn('py-10', className)} />;
  }

  return (
    <div
      ref={conteinerRef}
      role="img"
      aria-label={rotulo}
      className={cn('w-full min-w-0', className)}
      style={{ height: altura }}
    />
  );
}
