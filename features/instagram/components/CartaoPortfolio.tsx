'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { salvarTokenInstagram, sincronizarPortfolioInstagram } from '../actions';
import type { PortfolioVisao, StatusConta, StatusPortfolio } from '../consultas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mostrarFeedback, toast } from '@/lib/toast';
import type { Resultado } from '@/lib/action';

const ROTULO_PORTFOLIO: Record<StatusPortfolio, string> = {
  sem_token: 'Sem token',
  pendente: 'Aguardando sincronização',
  autenticada: 'Token válido',
  erro: 'Erro',
};

const VARIANT_PORTFOLIO = {
  sem_token: 'situacao-pendente',
  pendente: 'warning',
  autenticada: 'situacao-ativo',
  erro: 'destructive',
} as const;

const ROTULO_CONTA: Record<StatusConta, string> = {
  ok: 'Ok',
  erro: 'Erro',
  ausente: 'Ausente',
  pendente: 'Aguardando',
};

const VARIANT_CONTA = {
  ok: 'situacao-ativo',
  erro: 'destructive',
  ausente: 'situacao-inativo',
  pendente: 'warning',
} as const;

function avisar(resultado: Resultado<{ situacao?: string } | { id: string }>) {
  if (resultado.ok && 'situacao' in resultado.dados && resultado.dados.situacao === 'erro') {
    toast.error(resultado.mensagem);
    return;
  }
  mostrarFeedback(resultado);
}

export function CartaoPortfolio({ portfolio, chavePronta }: { portfolio: PortfolioVisao; chavePronta: boolean }) {
  const router = useRouter();
  const [salvo, salvar, salvando] = useActionState(
    async (_prev: Resultado<{ id: string }> | null, form: FormData) => {
      const resultado = await salvarTokenInstagram({
        portfolioId: portfolio.id,
        token: form.get('token'),
      });
      avisar(resultado);
      if (resultado.ok) router.refresh();
      return resultado;
    },
    null,
  );
  const [sync, sincronizar, sincronizando] = useActionState(async () => {
    const resultado = await sincronizarPortfolioInstagram({ portfolioId: portfolio.id });
    avisar(resultado);
    if (resultado.ok) router.refresh();
    return resultado;
  }, null);

  return (
    <Card>
      <CardHeader className="gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle>{portfolio.rotulo}</CardTitle>
          <CardDescription>
            {portfolio.nomeMeta ? `Reconhecido como ${portfolio.nomeMeta}. ` : ''}
            {portfolio.sincronizadoEmTexto ? `Última sincronização em ${portfolio.sincronizadoEmTexto}.` : 'Ainda sem sincronização.'}
          </CardDescription>
        </div>
        <Badge variant={VARIANT_PORTFOLIO[portfolio.status]}>{ROTULO_PORTFOLIO[portfolio.status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {portfolio.ultimoErro && (
          <Alert variant="destructive">
            <AlertDescription>{portfolio.ultimoErro}</AlertDescription>
          </Alert>
        )}
        {portfolio.status === 'autenticada' && portfolio.contas.length === 0 && (
          <Alert variant="warning">
            <AlertDescription>
              O token foi aceito, mas nenhuma conta Instagram voltou. Atribua a Página e o Instagram ao usuário do sistema e sincronize de novo.
            </AlertDescription>
          </Alert>
        )}

        <form action={salvar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor={`token-${portfolio.id}`}>Token do usuário do sistema</Label>
            <Input
              id={`token-${portfolio.id}`}
              name="token"
              type="password"
              autoComplete="off"
              required
              minLength={20}
              placeholder={portfolio.tokenDica ? `Token salvo, termina em ${portfolio.tokenDica}` : 'Cole o token gerado na Meta'}
              disabled={!chavePronta}
            />
          </div>
          <Button type="submit" disabled={salvando || !chavePronta} className="w-full sm:w-auto">
            {salvando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {salvando ? 'Salvando…' : 'Salvar token'}
          </Button>
        </form>
        {salvo && !salvo.ok && (
          <Alert variant="destructive">
            <AlertDescription>{salvo.mensagem}</AlertDescription>
          </Alert>
        )}

        <form action={sincronizar}>
          <Button type="submit" variant="outline" disabled={sincronizando || !portfolio.tokenConfigurado}>
            {sincronizando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {sincronizando ? 'Sincronizando…' : 'Sincronizar contas'}
          </Button>
        </form>
        {sync && !sync.ok && (
          <Alert variant="destructive">
            <AlertDescription>{sync.mensagem}</AlertDescription>
          </Alert>
        )}

        {portfolio.contas.length > 0 && (
          <ul className="divide-y divide-[var(--borda-app)] rounded-[var(--raio-card)] border border-[var(--borda-app)]">
            {portfolio.contas.map((conta) => (
              <li key={conta.id} className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--texto-forte)]">@{conta.username}</p>
                  <p className="truncate text-xs text-[var(--texto-suave)]">
                    {conta.nome ? `${conta.nome} · ` : ''}Página {conta.pageId}
                  </p>
                  {conta.ultimoErro && <p className="text-xs text-[var(--alerta-atrasada)]">{conta.ultimoErro}</p>}
                </div>
                <Badge variant={VARIANT_CONTA[conta.status]}>{ROTULO_CONTA[conta.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
