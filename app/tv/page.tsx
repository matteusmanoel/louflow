'use client';
/**
 * S1-09 (#11564): Painel de TV público em carrossel, alimentado por polling de /api/tv.
 * Identidade visual própria (docs/design-tokens.md §6): não importar tokens da interface principal.
 * Auto-atualiza a cada 30 s via fetch + setInterval.
 */

import { useEffect, useRef, useState } from 'react';
import type { PayloadTv, DemandaTv, AprovacaoTv, AgendamentoTv, CaptacaoTv, CorteTv } from '@/lib/tv';

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtData(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function fmtHora(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDataHora(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function corPrioridade(prioridade: string): string {
  switch (prioridade) {
    case 'Urgente': return 'var(--tv-urgente-texto)';
    case 'Alta':    return 'var(--tv-alta-texto)';
    case 'Normal':  return 'var(--tv-normal-texto)';
    default:        return 'var(--tv-baixa-texto)';
  }
}

function fundoPrioridade(prioridade: string): string {
  switch (prioridade) {
    case 'Urgente': return 'var(--tv-urgente-fundo)';
    case 'Alta':    return 'var(--tv-alta-fundo)';
    case 'Normal':  return 'var(--tv-normal-fundo)';
    default:        return 'var(--tv-baixa-fundo)';
  }
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function Chip({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: 700,
      color: cor,
      background: fundo,
      whiteSpace: 'nowrap',
    }}>
      {texto}
    </span>
  );
}

function SecaoTitulo({ titulo, contagem }: { titulo: string; contagem?: number }) {
  return (
    <h2 style={{
      margin: '0 0 12px',
      fontSize: '1rem',
      fontWeight: 700,
      color: 'var(--tv-texto-suave)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      {titulo}
      {contagem !== undefined && (
        <span style={{
          fontSize: '0.85rem',
          background: 'var(--tv-borda)',
          color: 'var(--tv-texto-forte)',
          borderRadius: '999px',
          padding: '1px 8px',
          fontWeight: 600,
        }}>
          {contagem}
        </span>
      )}
    </h2>
  );
}

function CardDemanda({ d }: { d: DemandaTv }) {
  return (
    <div style={{
      background: 'var(--tv-superficie)',
      border: '1px solid var(--tv-borda)',
      borderRadius: 'var(--tv-raio-card)',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--tv-texto-forte)', lineHeight: 1.3 }}>
          {d.titulo}
        </span>
        <Chip texto={d.prioridade} cor={corPrioridade(d.prioridade)} fundo={fundoPrioridade(d.prioridade)} />
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', color: 'var(--tv-texto-suave)', flexWrap: 'wrap' }}>
        <span>{d.formato}</span>
        {d.editor && <span>✏️ {d.editor}</span>}
        {d.influencer && <span>🎬 {d.influencer}</span>}
        {d.prazo && (
          <span style={{ color: 'var(--tv-destaque)', fontWeight: 600 }}>
            📅 {fmtData(d.prazo)}
          </span>
        )}
      </div>
      <div>
        <Chip texto={d.status} cor="var(--tv-texto-suave)" fundo="var(--tv-borda)" />
      </div>
    </div>
  );
}

function CardAprovacao({ a }: { a: AprovacaoTv }) {
  return (
    <div style={{
      background: 'var(--tv-superficie)',
      border: '1px solid var(--tv-borda)',
      borderRadius: 'var(--tv-raio-card)',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{a.titulo}</span>
      <div style={{ display: 'flex', gap: 10, fontSize: '0.82rem', color: 'var(--tv-texto-suave)', flexWrap: 'wrap' }}>
        {a.editor && <span>✏️ {a.editor}</span>}
        {a.influencer && <span>🎬 {a.influencer}</span>}
        <span>v{a.versao}</span>
        <span>desde {fmtDataHora(a.desde)}</span>
      </div>
    </div>
  );
}

function CardAgenda({ a }: { a: AgendamentoTv }) {
  return (
    <div style={{
      background: 'var(--tv-superficie)',
      border: '1px solid var(--tv-borda)',
      borderRadius: 'var(--tv-raio-card)',
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.titulo}</span>
      <div style={{ display: 'flex', gap: 8, fontSize: '0.8rem', color: 'var(--tv-texto-suave)', flexWrap: 'wrap' }}>
        <span>{a.marca}</span>
        <span>•</span>
        <span>{a.plataforma}</span>
        <span style={{ color: 'var(--tv-destaque)' }}>{fmtData(a.quando)} {fmtHora(a.quando)}</span>
      </div>
    </div>
  );
}

function CardCaptacao({ c }: { c: CaptacaoTv }) {
  return (
    <div style={{
      background: 'var(--tv-superficie)',
      border: '1px solid var(--tv-borda)',
      borderRadius: 'var(--tv-raio-card)',
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.videomaker}</span>
      <div style={{ display: 'flex', gap: 6, fontSize: '0.8rem', color: 'var(--tv-texto-suave)', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--tv-destaque)' }}>{fmtHora(c.inicio)} → {fmtHora(c.fim)}</span>
        {c.cliente && <span>• {c.cliente}</span>}
        {c.assunto && <span>• {c.assunto}</span>}
        {c.local && <span>📍 {c.local}</span>}
      </div>
    </div>
  );
}

function CardCorte({ c }: { c: CorteTv }) {
  return (
    <div style={{
      background: 'var(--tv-superficie)',
      border: '1px solid var(--tv-borda)',
      borderRadius: 'var(--tv-raio-card)',
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.titulo}</span>
      <div style={{ display: 'flex', gap: 8, fontSize: '0.8rem', color: 'var(--tv-texto-suave)', flexWrap: 'wrap' }}>
        <span>{c.linhaEditorial}</span>
        <span>•</span>
        <span>{c.programa}</span>
        {c.dataPostagem && <span style={{ color: 'var(--tv-destaque)' }}>📅 {fmtData(c.dataPostagem)}</span>}
      </div>
    </div>
  );
}

function ContadorResumo({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div style={{
      background: 'var(--tv-superficie)',
      border: '1px solid var(--tv-borda)',
      borderRadius: 'var(--tv-raio-card)',
      padding: '16px 20px',
      textAlign: 'center',
      flex: 1,
      minWidth: 120,
    }}>
      <div style={{ fontSize: '2.4rem', fontWeight: 800, color: cor, lineHeight: 1 }}>{valor}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--tv-texto-suave)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {rotulo}
      </div>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export default function PainelTv() {
  const [dados, setDados] = useState<PayloadTv | null>(null);
  const [erro, setErro] = useState(false);
  const [relogio, setRelogio] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const resp = await fetch('/api/tv', { cache: 'no-store' });
        if (!resp.ok) throw new Error('falha na resposta');
        const payload = (await resp.json()) as PayloadTv;
        if (!cancelado) {
          setDados(payload);
          setErro(false);
        }
      } catch {
        if (!cancelado) setErro(true);
      }
    }

    void carregar();
    timerRef.current = setInterval(() => void carregar(), 30_000);
    return () => {
      cancelado = true;
      clearInterval(timerRef.current);
    };
  }, []);

  // relógio em tempo real
  useEffect(() => {
    const tick = () =>
      setRelogio(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  if (!dados && !erro) {
    return (
      <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--tv-fundo)' }}>
        <span style={{ color: 'var(--tv-texto-suave)', fontSize: '1.1rem' }}>Carregando painel…</span>
      </main>
    );
  }

  if (erro && !dados) {
    return (
      <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--tv-fundo)' }}>
        <span style={{ color: 'var(--tv-urgente-texto)', fontSize: '1.1rem' }}>
          Erro ao carregar dados. Nova tentativa em 30 s…
        </span>
      </main>
    );
  }

  const p = dados!;

  return (
    <main style={{ padding: '20px 28px', minHeight: '100vh', background: 'var(--tv-fundo)' }}>
      {/* Topo */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottom: '1px solid var(--tv-borda)',
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--tv-destaque)', letterSpacing: '-0.01em' }}>
          LouFlow · Painel de TV
        </h1>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--tv-texto-forte)', fontVariantNumeric: 'tabular-nums' }}>
            {relogio}
          </div>
          {erro && (
            <div style={{ fontSize: '0.75rem', color: 'var(--tv-urgente-texto)' }}>⚠ erro na última atualização</div>
          )}
          {p.geradoEm && (
            <div style={{ fontSize: '0.72rem', color: 'var(--tv-texto-suave)' }}>
              atualizado {fmtDataHora(p.geradoEm)}
            </div>
          )}
        </div>
      </header>

      {/* Resumo do mês */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <ContadorResumo rotulo="Criadas no mês" valor={p.resumoMes.criadas} cor="var(--tv-texto-forte)" />
        <ContadorResumo rotulo="Concluídas no mês" valor={p.resumoMes.concluidas} cor="var(--tv-normal-texto)" />
        <ContadorResumo rotulo="Em andamento" valor={p.resumoMes.emAndamento} cor="var(--tv-destaque)" />
        <ContadorResumo rotulo="Atrasadas" valor={p.resumoMes.atrasadas} cor="var(--tv-urgente-texto)" />
      </div>

      {/* Grade principal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(580px, 1fr))', gap: 24 }}>

        {/* Demandas ativas */}
        {p.demandasPendentes.length > 0 && (
          <section style={{ gridColumn: '1 / -1' }}>
            <SecaoTitulo titulo="Demandas ativas" contagem={p.demandasPendentes.length} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {p.demandasPendentes.map((d) => <CardDemanda key={d.id} d={d} />)}
            </div>
          </section>
        )}

        {/* Aprovações pendentes */}
        {p.aprovacoes.length > 0 && (
          <section>
            <SecaoTitulo titulo="Aguardando aprovação" contagem={p.aprovacoes.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.aprovacoes.map((a, i) => <CardAprovacao key={`${a.demandaId}-${a.versao}-${i}`} a={a} />)}
            </div>
          </section>
        )}

        {/* Próximas captações */}
        {p.captacoes.length > 0 && (
          <section>
            <SecaoTitulo titulo="Captações agendadas" contagem={p.captacoes.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.captacoes.map((c, i) => <CardCaptacao key={`${c.inicio}-${i}`} c={c} />)}
            </div>
          </section>
        )}

        {/* Agenda de postagem */}
        {p.agenda.length > 0 && (
          <section>
            <SecaoTitulo titulo="Agenda de postagem" contagem={p.agenda.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.agenda.map((a, i) => <CardAgenda key={`${a.quando}-${i}`} a={a} />)}
            </div>
          </section>
        )}

        {/* Cortes em andamento */}
        {p.cortes.length > 0 && (
          <section>
            <SecaoTitulo titulo="Cortes em andamento" contagem={p.cortes.length} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.cortes.map((c, i) => <CardCorte key={`${c.titulo}-${i}`} c={c} />)}
            </div>
          </section>
        )}

        {/* Estado vazio */}
        {p.demandasPendentes.length === 0 &&
          p.aprovacoes.length === 0 &&
          p.captacoes.length === 0 &&
          p.agenda.length === 0 &&
          p.cortes.length === 0 && (
            <section style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: '1.2rem', color: 'var(--tv-texto-suave)' }}>
                Nenhuma demanda ativa no momento.
              </div>
            </section>
          )}
      </div>
    </main>
  );
}
