'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { EntradaSalvarArtigoWiki } from '../schema';
import { criarArtigoWiki, editarArtigoWiki } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
import { mostrarFeedback } from '@/lib/toast';

type ModoNovo = { modo: 'novo'; ordemSugerida: number };
type ModoEditar = { modo: 'editar'; id: string; valorInicial: EntradaSalvarArtigoWiki };
type Props = ModoNovo | ModoEditar;

function Asterisco() {
  return (
    <span className="text-alerta-atrasada" aria-hidden>
      *
    </span>
  );
}

const vazio: EntradaSalvarArtigoWiki = {
  category: '',
  title: '',
  summary: '',
  content: '',
  position: 1,
  is_published: false,
};

export function FormularioArtigo(props: Props) {
  const router = useRouter();
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [campos, setCampos] = useState<EntradaSalvarArtigoWiki>(
    props.modo === 'editar' ? props.valorInicial : { ...vazio, position: props.ordemSugerida },
  );

  function atualizar<K extends keyof EntradaSalvarArtigoWiki>(campo: K, valor: EntradaSalvarArtigoWiki[K]) {
    setCampos((prev) => ({ ...prev, [campo]: valor }));
  }

  function voltar() {
    router.push(props.modo === 'editar' ? `/wiki/${props.id}` : '/wiki');
  }

  function handleSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    iniciarTransicao(async () => {
      const resultado =
        props.modo === 'editar'
          ? await editarArtigoWiki({ ...campos, id: props.id })
          : await criarArtigoWiki(campos);
      mostrarFeedback(resultado);
      if (!resultado.ok) {
        setErro(resultado.mensagem);
        return;
      }
      router.push(`/wiki/${resultado.dados.id}`);
      router.refresh();
    });
  }

  const acimaDoLimite = campos.content.length > 15000;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="category">
          Categoria <Asterisco />
        </Label>
        <Input
          id="category"
          required
          maxLength={120}
          value={campos.category}
          onChange={(evento) => atualizar('category', evento.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">
          Título <Asterisco />
        </Label>
        <Input
          id="title"
          required
          maxLength={200}
          value={campos.title}
          onChange={(evento) => atualizar('title', evento.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="summary">Resumo</Label>
        <Input
          id="summary"
          maxLength={500}
          value={campos.summary}
          onChange={(evento) => atualizar('summary', evento.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="content">
          Conteúdo <Asterisco />
        </Label>
        <Textarea
          id="content"
          required
          maxLength={15000}
          rows={12}
          value={campos.content}
          onChange={(evento) => atualizar('content', evento.target.value)}
          className="min-h-48"
        />
        <p className={acimaDoLimite ? 'text-xs text-alerta-atrasada' : 'text-xs text-[var(--texto-suave)]'}>
          {campos.content.length}/15000
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="position">
          Ordem <Asterisco />
        </Label>
        <Input
          id="position"
          type="number"
          required
          min={1}
          max={999}
          step={1}
          value={campos.position}
          onChange={(evento) => atualizar('position', Number(evento.target.value))}
          className="max-w-32"
        />
        <p className="text-xs text-[var(--texto-suave)]">Número de 1 a 999. Define a sequência de leitura.</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_published"
          type="checkbox"
          checked={campos.is_published}
          onChange={(evento) => atualizar('is_published', evento.target.checked)}
          className="size-4 rounded border border-[var(--borda-app)] accent-[var(--loumar-700)]"
        />
        <Label htmlFor="is_published">Publicado</Label>
      </div>
      <p className="-mt-2 text-xs text-[var(--texto-suave)]">
        Enquanto estiver como rascunho, só administradores veem o artigo.
      </p>

      <RodapeAcoes
        secundaria={
          <Button type="button" variant="outline" onClick={voltar} disabled={pendente}>
            Cancelar
          </Button>
        }
        primaria={
          <Button type="submit" disabled={pendente}>
            {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {pendente ? 'Salvando…' : props.modo === 'editar' ? 'Salvar alterações' : 'Criar artigo'}
          </Button>
        }
      />
    </form>
  );
}
