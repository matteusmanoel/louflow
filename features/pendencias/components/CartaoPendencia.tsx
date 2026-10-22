'use client';

import { useState, useTransition } from 'react';
import { Aviso, Botao, Campo } from '@/components/ui';
import { confirmarRecebimento, adiarEntrega } from '../actions';
import type { PendenciaListada, AdiamentoListado } from '../consultas';
import s from './cartao.module.css';

function formatarData(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function diasAteEntrega(d: Date | null): number | null {
  if (!d) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ms = d.getTime() - hoje.getTime();
  return Math.ceil(ms / 86_400_000);
}

export function CartaoPendencia({
  pendencia,
  adiamentos,
}: {
  pendencia: PendenciaListada;
  adiamentos: AdiamentoListado[];
}) {
  const [isPending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'aviso' | 'erro' } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [motivo, setMotivo] = useState('');

  const dias = diasAteEntrega(pendencia.dataEntrega);
  const diasLabel =
    dias === null
      ? null
      : dias < 0
      ? `${Math.abs(dias)} dia(s) em atraso`
      : dias === 0
      ? 'Entrega hoje'
      : `${dias} dia(s) restante(s)`;

  function handleConfirmar() {
    startTransition(async () => {
      const res = await confirmarRecebimento({ demandaId: pendencia.id });
      setMensagem({ texto: res.mensagem, tipo: res.ok ? 'aviso' : 'erro' });
    });
  }

  function handleAdiar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await adiarEntrega({ demandaId: pendencia.id, novaData, motivo });
      setMensagem({ texto: res.mensagem, tipo: res.ok ? 'aviso' : 'erro' });
      if (res.ok) setShowForm(false);
    });
  }

  return (
    <article className={`${s.cartao} ${pendencia.prazoAtrasado ? s.atrasado : ''}`}>
      <header className={s.cabecalho}>
        <h2 className={s.titulo}>{pendencia.titulo}</h2>
        <span className={s.status}>{pendencia.status}</span>
      </header>

      <div className={s.meta}>
        <span className={s.prazo}>
          {pendencia.dataEntrega ? (
            <>
              Prazo:{' '}
              <time dateTime={pendencia.dataEntrega.toISOString().slice(0, 10)}>
                {formatarData(pendencia.dataEntrega)}
              </time>
            </>
          ) : (
            'Prazo não definido'
          )}
        </span>
        {diasLabel && (
          <span className={pendencia.prazoAtrasado ? s.textoAtrasado : s.textoPrazo}>{diasLabel}</span>
        )}
      </div>

      {adiamentos.length > 0 && (
        <details className={s.historico}>
          <summary>Histórico de adiamentos ({adiamentos.length})</summary>
          <ul className={s.listaAdiamentos}>
            {adiamentos.map((a) => (
              <li key={a.id} className={s.adiamento}>
                <time dateTime={a.criadoEm.toISOString()}>{formatarData(a.criadoEm)}</time>
                {a.usuarioNome && <span> · {a.usuarioNome}</span>}
                {a.detalhes && <p className={s.detalheAdiamento}>{a.detalhes}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {mensagem && (
        <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>
      )}

      <div className={s.acoes}>
        <Botao variante="neutro" onClick={handleConfirmar} disabled={isPending} type="button">
          Confirmar recebimento
        </Botao>
        <Botao variante="neutro" onClick={() => setShowForm((v) => !v)} disabled={isPending} type="button">
          {showForm ? 'Cancelar adiamento' : 'Solicitar adiamento'}
        </Botao>
      </div>

      {showForm && (
        <form className={s.formulario} onSubmit={handleAdiar}>
          <Campo
            rotulo="Nova data de entrega"
            id={`nova-data-${pendencia.id}`}
            type="date"
            required
            value={novaData}
            onChange={(e) => setNovaData(e.target.value)}
          />
          <Campo
            rotulo="Motivo do adiamento"
            id={`motivo-${pendencia.id}`}
            type="text"
            required
            maxLength={500}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <Botao type="submit" disabled={isPending}>
            {isPending ? 'Salvando…' : 'Confirmar adiamento'}
          </Botao>
        </form>
      )}
    </article>
  );
}
