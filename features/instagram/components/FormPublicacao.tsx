'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
import { agendarPublicacaoInstagram } from '../actions';
import { FORMATOS, MARCAS, midiaAceita, type FormatoMidia } from '../schema';
import { SeletorMidia } from './SeletorMidia';
import type { ContaVisao } from '../consultas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
import { mostrarFeedback } from '@/lib/toast';
import type { Resultado } from '@/lib/action';

const ROTULO_FORMATO = { imagem: 'Foto', reel: 'Reel', story: 'Story' } as const;

export function FormPublicacao({ contas }: { contas: ContaVisao[] }) {
  const router = useRouter();
  const [formato, setFormato] = useState<FormatoMidia | ''>('');
  const [arquivo, setArquivo] = useState<{ id: string; nome: string; mime: string } | null>(null);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [estado, dispatch, pendente] = useActionState(
    async (_prev: Resultado<{ id: string }> | null, form: FormData) => {
      const resultado = await agendarPublicacaoInstagram({
        contaId: form.get('contaId'),
        titulo: form.get('titulo'),
        legenda: form.get('legenda'),
        arquivoId: form.get('arquivoId'),
        formato: form.get('formato'),
        marca: form.get('marca'),
        quando: form.get('quando'),
      });
      mostrarFeedback(resultado);
      if (resultado.ok) router.refresh();
      return resultado;
    },
    null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendar publicação</CardTitle>
        <CardDescription>
          Escolha um arquivo do Drive ou envie um novo para a pasta aberta. O Instagram recebe o arquivo no horário marcado, em Brasília.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={dispatch} className="flex flex-col gap-4">
          {estado && !estado.ok && (
            <Alert variant="destructive">
              <AlertDescription>{estado.mensagem}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" name="titulo" required maxLength={200} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contaId">Conta</Label>
              <Select name="contaId" required>
                <SelectTrigger id="contaId">
                  <SelectValue placeholder="Escolha a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      @{conta.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="formato">Formato</Label>
              <Select
                name="formato"
                required
                value={formato || undefined}
                onValueChange={(valor) => {
                  const proximo = valor as FormatoMidia;
                  setFormato(proximo);
                  setArquivo((atual) => (atual && midiaAceita(proximo, atual.mime) ? atual : null));
                }}
              >
                <SelectTrigger id="formato">
                  <SelectValue placeholder="Escolha o formato" />
                </SelectTrigger>
                <SelectContent>
                  {FORMATOS.map((formato) => (
                    <SelectItem key={formato} value={formato}>
                      {ROTULO_FORMATO[formato]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="marca">Marca</Label>
              <Select name="marca" required>
                <SelectTrigger id="marca">
                  <SelectValue placeholder="Escolha a marca" />
                </SelectTrigger>
                <SelectContent>
                  {MARCAS.map((marca) => (
                    <SelectItem key={marca} value={marca}>
                      {marca}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quando">Data e hora</Label>
              <Input id="quando" name="quando" type="datetime-local" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Mídia</Label>
            <input type="hidden" name="arquivoId" value={arquivo?.id ?? ''} required />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                disabled={!formato || pendente}
                onClick={() => setSeletorAberto(true)}
              >
                <Upload className="h-4 w-4" aria-hidden />
                {arquivo ? 'Trocar arquivo' : 'Escolher do Drive'}
              </Button>
              <span className="min-w-0 truncate text-sm text-[var(--texto-suave)]">
                {arquivo?.nome ?? (formato ? 'Nenhum arquivo escolhido.' : 'Escolha o formato antes.')}
              </span>
            </div>
            {formato && seletorAberto && (
              <SeletorMidia
                aberto
                formato={formato}
                aoFechar={() => setSeletorAberto(false)}
                aoEscolher={setArquivo}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="legenda">Legenda</Label>
            <Textarea id="legenda" name="legenda" maxLength={2200} rows={4} />
          </div>
          <RodapeAcoes
            primaria={
              <Button type="submit" disabled={pendente} className="w-full sm:w-auto">
                {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {pendente ? 'Agendando…' : 'Agendar'}
              </Button>
            }
          />
        </form>
      </CardContent>
    </Card>
  );
}
