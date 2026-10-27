'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { PERFIS_ATENDIDOS } from '../schema';
import type { EntradaRegistrarUsoDrone } from '../schema';
import { registrarUsoDrone, editarUsoDrone } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
import { mostrarFeedback } from '@/lib/toast';

type ModoNovo = { modo: 'novo' };
type ModoEditar = {
  modo: 'editar';
  id: string;
  versao: string;
  valorInicial: EntradaRegistrarUsoDrone;
};
type Props = ModoNovo | ModoEditar;

function Asterisco() {
  return (
    <span className="text-alerta-atrasada" aria-hidden>
      *
    </span>
  );
}

export function FormularioDrone(props: Props) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const inicial: EntradaRegistrarUsoDrone =
    props.modo === 'editar'
      ? props.valorInicial
      : { used_on: '', responsible: '', served_profile: '', reason: '', location: '' };

  const [campos, setCampos] = useState(inicial);

  function atualizar(campo: keyof EntradaRegistrarUsoDrone, valor: string) {
    setCampos((prev) => ({ ...prev, [campo]: valor }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    iniciarTransicao(async () => {
      const resultado =
        props.modo === 'editar'
          ? await editarUsoDrone({ ...campos, id: props.id, versao: props.versao })
          : await registrarUsoDrone(campos);

      mostrarFeedback(resultado);
      if (!resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      router.push('/drone');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="used_on">
          Data do uso <Asterisco />
        </Label>
        <Input
          id="used_on"
          type="date"
          required
          value={campos.used_on}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => atualizar('used_on', e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="responsible">
          Responsável <Asterisco />
        </Label>
        <Input
          id="responsible"
          type="text"
          required
          maxLength={200}
          value={campos.responsible}
          onChange={(e) => atualizar('responsible', e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="served_profile">
          Perfil atendido <Asterisco />
        </Label>
        <Select
          value={campos.served_profile}
          onValueChange={(v) => atualizar('served_profile', v)}
          required
        >
          <SelectTrigger id="served_profile">
            <SelectValue placeholder="Selecione…" />
          </SelectTrigger>
          <SelectContent>
            {PERFIS_ATENDIDOS.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason">
          Motivo <Asterisco />
        </Label>
        <Input
          id="reason"
          type="text"
          required
          maxLength={500}
          value={campos.reason}
          onChange={(e) => atualizar('reason', e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="location">
          Local <Asterisco />
        </Label>
        <Input
          id="location"
          type="text"
          required
          maxLength={200}
          value={campos.location}
          onChange={(e) => atualizar('location', e.target.value)}
        />
      </div>

      <div className="rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--fundo-app)] px-4 py-3 text-xs text-[var(--texto-suave)]">
        Valor fixo por uso: <strong className="fonte-numero text-[var(--texto-forte)]">R$ 250,00</strong>
      </div>

      <RodapeAcoes
        secundaria={
          <Button type="button" variant="outline" onClick={() => router.push('/drone')} disabled={pendente}>
            Cancelar
          </Button>
        }
        primaria={
          <Button type="submit" disabled={pendente}>
            {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {pendente ? 'Salvando…' : props.modo === 'editar' ? 'Salvar alterações' : 'Registrar uso'}
          </Button>
        }
      />
    </form>
  );
}
