'use client';

import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { mostrarFeedback } from '@/lib/toast';
import { enviarEnsaio } from '../actions';

const TEXTO_SUPORTE = 'Olá, Mateus. Gostaria de alterar o horário do disparo dos alertas';
const LINK_SUPORTE = `https://wa.me/5545998230845?text=${encodeURIComponent(TEXTO_SUPORTE)}`;

export function FormularioAvisos() {
  const [ensaiando, iniciarEnsaio] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--texto-forte)]">Horário do resumo</p>
            <p className="text-sm text-[var(--texto-suave)]">10:00, America/Sao_Paulo. Uma mensagem por dia.</p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href={LINK_SUPORTE} target="_blank" rel="noopener noreferrer">
              Suporte
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <h2 className="text-sm font-medium text-[var(--texto-forte)]">Ensaio</h2>
          <p className="text-sm text-[var(--texto-suave)]">
            Envia um exemplar do resumo diário para o destino configurado neste ambiente.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={ensaiando}
            className="w-full sm:w-auto"
            onClick={() => {
              iniciarEnsaio(async () => {
                mostrarFeedback(await enviarEnsaio({}));
              });
            }}
          >
            {ensaiando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {ensaiando ? 'Enviando…' : 'Enviar ensaio'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
