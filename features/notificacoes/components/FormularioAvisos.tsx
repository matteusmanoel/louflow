'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
import { mostrarFeedback } from '@/lib/toast';
import { enviarEnsaio, salvarCadencia } from '../actions';
import type { CadenciaAvisos } from '../consultas';

const HORAS = Array.from({ length: 24 }, (_, hora) => String(hora).padStart(2, '0'));

type Props = { cadencia: CadenciaAvisos };

export function FormularioAvisos({ cadencia }: Props) {
  const [horaPrazo, setHoraPrazo] = useState(String(cadencia.horaPrazo));
  const [horaPendencia, setHoraPendencia] = useState(String(cadencia.horaPendencia));
  const [salvando, iniciarSalvar] = useTransition();
  const [ensaiando, iniciarEnsaio] = useTransition();

  function salvar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    iniciarSalvar(async () => {
      const resultado = await salvarCadencia({
        horaPrazo: Number(horaPrazo),
        antecedenciaDias: Number(dados.get('antecedenciaDias')),
        horaPendencia: Number(horaPendencia),
        folgaHoras: Number(dados.get('folgaHoras')),
      });
      mostrarFeedback(resultado);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={salvar} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium text-[var(--texto-forte)]">Prazo das demandas</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="horaPrazo">Horário</Label>
                  <Select value={horaPrazo} onValueChange={setHoraPrazo}>
                    <SelectTrigger id="horaPrazo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HORAS.map((hora) => (
                        <SelectItem key={hora} value={String(Number(hora))}>
                          {hora}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="antecedenciaDias">Antecedência (dias)</Label>
                  <Input
                    id="antecedenciaDias"
                    name="antecedenciaDias"
                    type="number"
                    min={1}
                    max={14}
                    required
                    defaultValue={cadencia.antecedenciaDias}
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium text-[var(--texto-forte)]">Pendência do influencer</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="horaPendencia">Horário</Label>
                  <Select value={horaPendencia} onValueChange={setHoraPendencia}>
                    <SelectTrigger id="horaPendencia">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HORAS.map((hora) => (
                        <SelectItem key={`p-${hora}`} value={String(Number(hora))}>
                          {hora}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="folgaHoras">Folga (horas)</Label>
                  <Input
                    id="folgaHoras"
                    name="folgaHoras"
                    type="number"
                    min={1}
                    max={168}
                    required
                    defaultValue={cadencia.folgaHoras}
                  />
                </div>
              </div>
            </fieldset>

            <p className="text-sm text-[var(--texto-suave)]">
              Horários em America/Sao_Paulo. Ajuste e aprovação saem na hora. O grupo não tem opt-out.
            </p>

            <RodapeAcoes
              primaria={
                <Button type="submit" disabled={salvando} className="w-full sm:w-auto">
                  {salvando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {salvando ? 'Salvando…' : 'Salvar cadência'}
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
            Envia um exemplar de cada modelo para o destino configurado neste ambiente.
          </p>
          <RodapeAcoes
            primaria={
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
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
