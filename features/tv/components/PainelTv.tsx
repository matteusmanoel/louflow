'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PayloadTv } from '@/lib/tv';
import { montarSlides } from './Slides';

const RELOAD_MS = 30 * 60 * 1000;
const RETENTATIVA_MS = 15_000;
const FUSO = 'America/Sao_Paulo';

function payloadValido(valor: unknown): valor is PayloadTv {
  if (!valor || typeof valor !== 'object') return false;
  const candidato = valor as Partial<PayloadTv>;
  return Boolean(candidato.geradoEm && candidato.resumoMes && Array.isArray(candidato.demandasPendentes));
}

export function PainelTv({ inicial }: { inicial: PayloadTv | null }) {
  const [dados, setDados] = useState<PayloadTv | null>(inicial);
  const [erro, setErro] = useState(false);
  const [indice, setIndice] = useState(0);
  const [ciclo, setCiclo] = useState(0);
  const [relogio, setRelogio] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);

  const renovar = useCallback(async () => {
    try {
      const resp = await fetch('/api/tv');
      if (!resp.ok) throw new Error('falha');
      const payload: unknown = await resp.json();
      if (!payloadValido(payload)) throw new Error('formato');
      setDados(payload);
      setErro(false);
    } catch {
      setErro(true);
    } finally {
      setIndice(0);
      setCiclo((atual) => atual + 1);
    }
  }, []);

  useEffect(() => {
    if (dados) return;
    const id = window.setTimeout(() => void renovar(), ciclo === 0 ? 0 : RETENTATIVA_MS);
    return () => window.clearTimeout(id);
  }, [dados, ciclo, renovar]);

  useEffect(() => {
    const id = window.setTimeout(() => window.location.reload(), RELOAD_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const tick = () => {
      setRelogio(new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: FUSO,
      }));
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  const slides = useMemo(() => (dados ? montarSlides(dados) : []), [dados]);
  const posicao = slides.length ? indice % slides.length : 0;

  useEffect(() => {
    if (!slides.length) return;
    const espera = window.setTimeout(() => {
      if (posicao + 1 >= slides.length) void renovar();
      else setIndice(posicao + 1);
    }, slides[posicao]!.duracao);
    return () => window.clearTimeout(espera);
  }, [posicao, ciclo, slides, renovar]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ativo = stage.querySelector<HTMLElement>('.slide.ativo');
    if (!ativo) return;
    const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    ativo.querySelectorAll<HTMLElement>('.barra-fill').forEach((barra, ordem) => {
      const alvo = Math.max(0, Math.min(100, Number(barra.dataset.pct) || 0));
      if (reduzido) {
        barra.style.width = `${alvo}%`;
        return;
      }
      barra.style.transition = 'none';
      barra.style.width = '0%';
      void barra.offsetWidth;
      barra.style.transition = `width 1.4s cubic-bezier(.22,.61,.36,1) ${140 + ordem * 110}ms`;
      requestAnimationFrame(() => {
        barra.style.width = `${alvo}%`;
      });
    });
  }, [posicao, ciclo, slides]);

  const horaAtualizado = dados?.geradoEm
    ? new Date(dados.geradoEm).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: FUSO,
      })
    : '';

  return (
    <>
      <div className="bg-glow" aria-hidden />
      <div className="frame">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden>LF</div>
            <div className="brand-text">
              <h1>LouFlow</h1>
              <p>Painel ao vivo</p>
            </div>
          </div>
          <div className="topbar-right">
            {erro && <span className="aviso-rede">sem atualizar</span>}
            {horaAtualizado && <span className="atualizado">atualizado {horaAtualizado}</span>}
            <time className="clock" dateTime={relogio}>{relogio || '--:--'}</time>
          </div>
        </header>

        <div className="stage" ref={stageRef}>
          {!dados && (
            <p className="espera">
              {erro ? 'Sem conexão com o painel. Nova tentativa em instantes.' : 'Carregando painel…'}
            </p>
          )}
          {slides.map((slide, ordem) => (
            <section
              key={slide.id}
              className={ordem === posicao ? 'slide ativo' : 'slide'}
              aria-hidden={ordem !== posicao}
            >
              {slide.conteudo}
            </section>
          ))}
        </div>

        <div className="dots" aria-hidden>
          {slides.map((slide, ordem) => (
            <div key={slide.id} className={ordem === posicao ? 'dot ativo' : 'dot'} />
          ))}
        </div>
      </div>
    </>
  );
}
