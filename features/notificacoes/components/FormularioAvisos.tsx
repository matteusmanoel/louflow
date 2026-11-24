'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
import { mostrarFeedback } from '@/lib/toast';
import { enviarEnsaio, salvarCadencia } from '../actions';
import type { CadenciaAvisos } from '../consultas';

const HORAS = Array.from({ length: 24 }, (_, hora) => String(hora).padStart(2, '0'));

type Props = { cadencia: CadenciaAvisos };

export function FormularioAvisos({ cadencia }: Props) {
  const [hora, setHora] = useState(String(cadencia.horaPrazo));
  const [salvando, iniciarSalvar] = useTransition();
  const [ensaiando, iniciarEnsaio] = useTransition();

  function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    iniciarSalvar(async () => {
      const resultado = await salvarCadencia({ hora: Number(hora) });
      mostrarFeedback(resultado);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={salvar} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="horaResumo">Horário do resumo</Label>
              <Select value={hora} onValueChange={setHora}>
                <SelectTrigger id="horaResumo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HORAS.map((opcao) => (
                    <SelectItem key={opcao} value={String(Number(opcao))}>
                      {opcao}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-[var(--texto-suave)]">
              Horário em America/Sao_Paulo. O grupo recebe uma mensagem por dia, com as demandas atrasadas e as que
              aguardam aprovação. O grupo não tem opt-out.
            </p>

            <RodapeAcoes
              primaria={
                <Button type="submit" disabled={salvando} className="w-full sm:w-auto">
                  {salvando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {salvando ? 'Salvando…' : 'Salvar horário'}
                </Button>
              }
            />
          </form>
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
