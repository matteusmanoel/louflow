'use client';

import { useTransition, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { criarCorte } from '../actions';
import { LINHAS_EDITORIAIS, PROGRAMAS_ORIGEM } from '../schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mostrarFeedback } from '@/lib/toast';

export function FormCriarCorte({ aoSalvar }: { aoSalvar?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setErro(null);

    startTransition(async () => {
      const resultado = await criarCorte({
        titulo: fd.get('titulo') as string,
        influencerId: (fd.get('influencerId') as string) || null,
        dataPostagem: fd.get('dataPostagem') as string,
        linhaEditorial: fd.get('linhaEditorial') as (typeof LINHAS_EDITORIAIS)[number],
        linkVideo: (fd.get('linkVideo') as string) || null,
        programaOrigem: fd.get('programaOrigem') as (typeof PROGRAMAS_ORIGEM)[number],
      });

      mostrarFeedback(resultado);
      if (resultado.ok) {
        form.reset();
        aoSalvar?.();
      } else {
        setErro(resultado.mensagem);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-label="Novo corte">
      <p className="fonte-titulo text-sm font-semibold text-[var(--texto-forte)]">Novo Corte</p>

      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="titulo">Título (tarefa) *</Label>
        <Input
          id="titulo"
          name="titulo"
          placeholder="Ex.: Entrevista no centro de Foz"
          required
          maxLength={300}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="linhaEditorial">Linha Editorial *</Label>
          <Select name="linhaEditorial" required>
            <SelectTrigger id="linhaEditorial">
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              {LINHAS_EDITORIAIS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="programaOrigem">Programa de Origem *</Label>
          <Select name="programaOrigem" required>
            <SelectTrigger id="programaOrigem">
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              {PROGRAMAS_ORIGEM.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dataPostagem">Data de Postagem *</Label>
          <Input id="dataPostagem" name="dataPostagem" type="date" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="influencerId">ID do Influencer (opcional)</Label>
          <Input id="influencerId" name="influencerId" placeholder="UUID do influencer" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="linkVideo">Link do Vídeo (opcional)</Label>
        <Input id="linkVideo" name="linkVideo" type="url" placeholder="https://drive.google.com/…" />
      </div>

      <RodapeAcoes
        primaria={
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {pending ? 'Salvando…' : 'Cadastrar Corte'}
          </Button>
        }
      />
    </form>
  );
}
