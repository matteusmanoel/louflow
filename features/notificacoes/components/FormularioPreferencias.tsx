'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
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
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {resultado && !resultado.ok && (
            <Alert variant="destructive">
              <AlertDescription>{resultado.mensagem}</AlertDescription>
            </Alert>
          )}
          {resultado?.ok && (
            <Alert variant="info">
              <AlertDescription>{resultado.mensagem}</AlertDescription>
            </Alert>
          )}

          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {(Object.keys(ROTULOS) as (keyof PreferenciasNotificacao)[]).map((chave) => (
              <li key={chave}>
                <label className="flex cursor-pointer items-center gap-3 rounded-[var(--raio-input)] border border-[var(--borda-app)] bg-[var(--superficie)] px-3 py-2.5 transition-colors hover:border-[var(--loumar-600)]">
                  <input
                    type="checkbox"
                    name={chave}
                    defaultChecked={preferencias[chave]}
                    className="size-4 shrink-0 border border-[var(--borda-app)] accent-[var(--loumar-600)]"
                  />
                  <span className="text-sm text-[var(--texto-forte)]">{ROTULOS[chave]}</span>
                </label>
              </li>
            ))}
          </ul>

          <RodapeAcoes
            primaria={
              <Button type="submit" disabled={pendente} className="w-full sm:w-auto">
                {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {pendente ? 'Salvando…' : 'Salvar preferências'}
              </Button>
            }
          />
        </form>
      </CardContent>
    </Card>
  );
}
