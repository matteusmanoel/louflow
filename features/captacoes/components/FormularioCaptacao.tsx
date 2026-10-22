'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Campo, Botao } from '@/components/ui';
import type { Resultado } from '@/lib/action';
import type { Captacao } from '../consultas';
import { agendarCaptacao, editarCaptacao, cancelarCaptacao } from '../actions';
import s from './captacoes.module.css';

type Videomaker = { id: string; nome: string };

type Props = {
  videomakers: Videomaker[];
  captacao?: Captacao;
};

type Estado = { mensagem: string; ok?: boolean } | null;

function toInputDatetime(d: Date): string {
  // yyyy-MM-ddTHH:mm format expected by datetime-local
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function FormularioCaptacao({ videomakers, captacao }: Props) {
  const router = useRouter();
  const edicao = !!captacao;

  const acao = async (_anterior: Estado, form: FormData): Promise<Estado> => {
    const entrada: Record<string, unknown> = {
      startsAt: new Date(form.get('startsAt') as string).toISOString(),
      endsAt: new Date(form.get('endsAt') as string).toISOString(),
      videomakerId: form.get('videomakerId'),
      influencerId: form.get('influencerId') || undefined,
      client: form.get('client') || undefined,
      subject: form.get('subject') || undefined,
      location: form.get('location') || undefined,
    };
    if (edicao) entrada.id = captacao.id;

    const resultado: Resultado<{ id: string }> = edicao
      ? await editarCaptacao(entrada)
      : await agendarCaptacao(entrada);

    if (!resultado.ok) return { mensagem: resultado.mensagem };
    router.push('/captacoes');
    return { mensagem: resultado.mensagem, ok: true };
  };

  const [estado, dispatch, pendente] = useActionState(acao, null);

  return (
    <form action={dispatch} className={s.form}>
      {estado && !estado.ok && (
        <div role="alert" className={s.erroForm}>
          {estado.mensagem}
        </div>
      )}

      <div className={s.formDuplo}>
        <Campo
          rotulo="Início"
          id="startsAt"
          name="startsAt"
          type="datetime-local"
          required
          defaultValue={captacao ? toInputDatetime(captacao.startsAt) : undefined}
        />
        <Campo
          rotulo="Fim"
          id="endsAt"
          name="endsAt"
          type="datetime-local"
          required
          defaultValue={captacao ? toInputDatetime(captacao.endsAt) : undefined}
        />
      </div>

      <label className={s.form} style={{ gap: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--texto-suave)',
          }}
        >
          Videomaker
        </span>
        <select name="videomakerId" required defaultValue={captacao?.videomakerId ?? ''} style={{ minHeight: 42, padding: '0 12px', borderRadius: 'var(--raio-input)', border: '1px solid var(--borda-app)', background: 'var(--superficie)', fontSize: 14 }}>
          <option value="" disabled>
            Selecione…
          </option>
          {videomakers.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nome}
            </option>
          ))}
        </select>
      </label>

      <Campo rotulo="Cliente" id="client" name="client" type="text" maxLength={200} defaultValue={captacao?.client ?? ''} />
      <Campo rotulo="Assunto" id="subject" name="subject" type="text" maxLength={200} defaultValue={captacao?.subject ?? ''} />
      <Campo rotulo="Local" id="location" name="location" type="text" maxLength={200} defaultValue={captacao?.location ?? ''} />

      <div className={s.acoes}>
        <Botao variante="neutro" type="button" onClick={() => router.back()}>
          Voltar
        </Botao>
        <Botao type="submit" disabled={pendente}>
          {pendente ? 'Salvando…' : edicao ? 'Salvar alterações' : 'Agendar Captação'}
        </Botao>
      </div>
    </form>
  );
}

export function BotaoCancelarCaptacao({ id }: { id: string }) {
  const router = useRouter();

  const acao = async () => {
    const resultado = await cancelarCaptacao({ id });
    if (resultado.ok) router.push('/captacoes');
    else alert(resultado.mensagem);
  };

  return (
    <Botao variante="neutro" type="button" onClick={acao}>
      Cancelar Captação
    </Botao>
  );
}
