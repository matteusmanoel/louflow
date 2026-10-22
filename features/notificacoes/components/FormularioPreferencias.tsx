'use client';

import { useState, useTransition } from 'react';
import { Botao, Aviso, Cartao, Titulo } from '@/components/ui';
import { salvarPreferencias } from '../actions';
import type { PreferenciasNotificacao } from '../consultas';
import type { Resultado } from '@/lib/action';

const ROTULOS: Record<keyof PreferenciasNotificacao, string> = {
  editor_atribuido: 'Editor atribuído à demanda',
  status_alterado: 'Mudança de status',
  novo_comentario: 'Novo comentário',
  ajuste_solicitado: 'Solicitação de ajuste',
  concluida_aprovada: 'Conclusão ou aprovação',
  prazo_proximo: 'Prazo próximo',
};

type Props = { preferencias: PreferenciasNotificacao };

export function FormularioPreferencias({ preferencias }: Props) {
  const [resultado, setResultado] = useState<Resultado<null> | null>(null);
  const [pendente, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const entrada = Object.fromEntries(
      (Object.keys(ROTULOS) as (keyof PreferenciasNotificacao)[]).map((k) => [
        k,
        formData.get(k) === 'on',
      ]),
    ) as PreferenciasNotificacao;

    startTransition(async () => {
      const r = await salvarPreferencias(entrada);
      setResultado(r);
    });
  }

  return (
    <Cartao>
      <Titulo sobre="Conta">Preferências de Notificação</Titulo>
      <p style={{ color: 'var(--texto-suave)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        Escolha quais eventos você deseja receber por e-mail.
      </p>

      <form onSubmit={handleSubmit}>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {(Object.keys(ROTULOS) as (keyof PreferenciasNotificacao)[]).map((chave) => (
            <li key={chave}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--borda-app)',
                  background: 'var(--superficie)',
                  minWidth: 0,
                }}
              >
                <input
                  type="checkbox"
                  name={chave}
                  defaultChecked={preferencias[chave]}
                  style={{ accentColor: 'var(--loumar-600)', width: '1.125rem', height: '1.125rem', flexShrink: 0 }}
                />
                <span style={{ color: 'var(--texto-forte)', fontSize: '0.9375rem' }}>{ROTULOS[chave]}</span>
              </label>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Botao type="submit" disabled={pendente}>
            {pendente ? 'Salvando…' : 'Salvar preferências'}
          </Botao>
        </div>

        {resultado && !resultado.ok && (
          <Aviso tipo="erro">
            {resultado.mensagem}
          </Aviso>
        )}
        {resultado?.ok && (
          <Aviso>
            {resultado.mensagem}
          </Aviso>
        )}
      </form>
    </Cartao>
  );
}
