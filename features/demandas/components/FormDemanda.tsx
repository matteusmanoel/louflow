'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import type { Demanda } from '../consultas';
import { criarDemanda, editarDemanda, excluirDemanda } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { mostrarFeedback } from '@/lib/toast';
import { RodapeAcoes } from '@/components/ui/rodape-acoes';
import { PainelEntidade, useFecharPainel } from '@/components/ui/painel-entidade';

type Opcao = { id: string; nome: string; label?: string };

type Props = {
  formatos: string[];
  editores: Opcao[];
  influencers: Opcao[];
  demanda?: Demanda;
  podeDefinirOutroEditor: boolean;
  podeExcluir: boolean;
  variante?: 'pagina' | 'modal';
};

const LINHAS_EDITORIAIS = ['Viral', 'Comunidade', 'Educacional'] as const;

/** Radix não aceita SelectItem value="". O sentinela vira null antes da action. */
function sentinela(valor: FormDataEntryValue | null, marca: string): string | null {
  const texto = typeof valor === 'string' ? valor : '';
  if (!texto || texto === marca) return null;
  return texto;
}
const PRIORIDADES = ['Baixa', 'Normal', 'Alta', 'Urgente'] as const;

export function FormDemanda({
  formatos,
  editores,
  influencers,
  demanda,
  podeDefinirOutroEditor,
  podeExcluir,
  variante = 'pagina',
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sujo, setSujo] = useState(false);
  const [formato, setFormato] = useState(demanda?.format ?? '');
  const formRef = useRef<HTMLFormElement>(null);

  function marcarSujo() {
    setSujo(true);
  }

  const ehCortes = formato === 'Cortes';
  const ehFicha = formato === 'Ficha técnica';
  const editando = Boolean(demanda);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const dados = new FormData(e.currentTarget);

    const entrada = {
      ...(editando ? { id: demanda!.id } : {}),
      title: dados.get('title') as string,
      format: dados.get('format') as string,
      influencer_id: sentinela(dados.get('influencer_id'), 'nenhum'),
      editor_id: sentinela(dados.get('editor_id'), 'nenhum'),
      priority: dados.get('priority') as 'Baixa' | 'Normal' | 'Alta' | 'Urgente',
      approval_date: (dados.get('approval_date') as string) || null,
      post_date: (dados.get('post_date') as string) || null,
      info: (dados.get('info') as string) || null,
      link: (dados.get('link') as string) || null,
      editorial_line: sentinela(dados.get('editorial_line'), 'nenhum') as 'Viral' | 'Comunidade' | 'Educacional' | null,
      source_program: (dados.get('source_program') as string) || null,
      clips_count: dados.get('clips_count') ? Number(dados.get('clips_count')) : null,
    };

    startTransition(async () => {
      const resultado = editando
        ? await editarDemanda(entrada)
        : await criarDemanda(entrada);

      if (resultado.ok) {
        mostrarFeedback(resultado);
        setSujo(false);
        const destino = editando
          ? `/demandas/${demanda!.id}?aba=detalhes`
          : `/demandas/${resultado.dados.id}`;
        router.push(destino);
        router.refresh();
      } else {
        setErro(resultado.mensagem);
      }
    });
  }

  async function handleExcluir() {
    if (!demanda) return;
    startTransition(async () => {
      const resultado = await excluirDemanda({ id: demanda.id });
      mostrarFeedback(resultado);
      if (resultado.ok) {
        router.push('/demandas');
        router.refresh();
      } else {
        setErro(resultado.mensagem);
      }
    });
  }

  return (
    <PainelEntidade
      variante={variante}
      titulo={editando ? 'Editar demanda' : 'Nova demanda'}
      grupo="Produção"
      sujo={sujo}
      destinoFechar={
        editando ? `/demandas/${demanda!.id}?aba=detalhes` : variante === 'pagina' ? '/demandas' : undefined
      }
      rodape={<RodapeFormulario editando={editando} podeExcluir={podeExcluir} isPending={isPending} demanda={demanda} aoExcluir={() => void handleExcluir()} />}
    >
    <form
      id="form-demanda"
      ref={formRef}
      onSubmit={(e) => void handleSubmit(e)}
      onChange={marcarSujo}
      className="flex max-w-3xl flex-col gap-4"
    >
      {erro && (
        <Alert variant="destructive">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {/* Título */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={demanda?.title ?? ''}
          maxLength={300}
          placeholder="Descreva a demanda"
        />
      </div>

      {/* Formato */}
      <div className="space-y-1.5">
        <Label htmlFor="format">Formato *</Label>
        <Select
          name="format"
          required
          value={formato}
          onValueChange={(valor) => {
            setFormato(valor);
            marcarSujo();
          }}
        >
          <SelectTrigger id="format">
            <SelectValue placeholder="Selecione…" />
          </SelectTrigger>
          <SelectContent>
            {formatos.map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {ehCortes && (
        <Alert variant="warning">
          <AlertDescription>
            Demandas de Cortes recebem o Editor padrão automaticamente e não podem ser assumidas da Fila.
          </AlertDescription>
        </Alert>
      )}

      {/* Influencer */}
      {influencers.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="influencer_id">Influencer</Label>
          <Select name="influencer_id" defaultValue={demanda?.influencer_id || 'nenhum'} onValueChange={marcarSujo}>
            <SelectTrigger id="influencer_id">
              <SelectValue placeholder="— Nenhum —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">— Nenhum —</SelectItem>
              {influencers.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Editor */}
      {!ehCortes && podeDefinirOutroEditor && editores.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="editor_id">
            Editor
            {ehFicha && (
              <span className="text-[var(--texto-suave)] font-normal ml-1">
                (opcional — entra na Fila se vazio)
              </span>
            )}
          </Label>
          <Select name="editor_id" defaultValue={demanda?.editor_id || 'nenhum'} onValueChange={marcarSujo}>
            <SelectTrigger id="editor_id">
              <SelectValue placeholder="— A definir —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nenhum">— A definir —</SelectItem>
              {editores.map((ed) => (
                <SelectItem key={ed.id} value={ed.id}>{ed.label ?? ed.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Prioridade */}
      <div className="space-y-1.5">
        <Label htmlFor="priority">Prioridade</Label>
        <Select name="priority" defaultValue={demanda?.priority ?? 'Normal'} onValueChange={marcarSujo}>
          <SelectTrigger id="priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORIDADES.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="approval_date">Data para aprovação</Label>
          <Input id="approval_date" name="approval_date" type="date" defaultValue={demanda?.approval_date ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="post_date">Data de postagem</Label>
          <Input id="post_date" name="post_date" type="date" defaultValue={demanda?.post_date ?? ''} />
        </div>
      </div>

      {/* Link */}
      <div className="space-y-1.5">
        <Label htmlFor="link">Link externo</Label>
        <Input
          id="link"
          name="link"
          type="url"
          placeholder="https://drive.google.com/…"
          defaultValue={demanda?.link ?? ''}
        />
      </div>

      {/* Campos de Cortes */}
      {ehCortes && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="editorial_line">Linha Editorial</Label>
            <Select name="editorial_line" defaultValue={demanda?.editorial_line || 'nenhum'} onValueChange={marcarSujo}>
              <SelectTrigger id="editorial_line">
                <SelectValue placeholder="— Selecione —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">— Selecione —</SelectItem>
                {LINHAS_EDITORIAIS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="source_program">Programa de Origem</Label>
            <Input id="source_program" name="source_program" defaultValue={demanda?.source_program ?? ''} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clips_count">Quantidade de Cortes</Label>
            <Input
              id="clips_count"
              name="clips_count"
              type="number"
              min="1"
              max="999"
              defaultValue={demanda?.clips_count?.toString() ?? ''}
            />
          </div>
        </>
      )}

      {/* Observações */}
      <div className="space-y-1.5">
        <Label htmlFor="info">Observações</Label>
        <Textarea
          id="info"
          name="info"
          defaultValue={demanda?.info ?? ''}
          maxLength={2000}
          rows={3}
        />
      </div>

    </form>
    </PainelEntidade>
  );
}

function RodapeFormulario({
  editando,
  podeExcluir,
  isPending,
  demanda,
  aoExcluir,
}: {
  editando: boolean;
  podeExcluir: boolean;
  isPending: boolean;
  demanda?: Demanda;
  aoExcluir: () => void;
}) {
  const fechar = useFecharPainel();

  return (
    <RodapeAcoes
      secundaria={
        <Button type="button" variant="outline" onClick={fechar} disabled={isPending}>
          Cancelar
        </Button>
      }
      primaria={
        <Button type="submit" form="form-demanda" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isPending ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar demanda'}
        </Button>
      }
      destrutiva={
        editando && podeExcluir && demanda ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                className="border-[var(--alerta-atrasada)] text-[var(--alerta-atrasada)] hover:bg-[var(--alerta-atrasada-fundo)]"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mover para Lixeira?</AlertDialogTitle>
                <AlertDialogDescription>
                  A demanda <strong>&quot;{demanda.title}&quot;</strong> será movida para a Lixeira.
                  É possível restaurá-la posteriormente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={aoExcluir}
                  className="bg-[var(--alerta-atrasada)] text-white hover:opacity-90"
                >
                  Mover para Lixeira
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : undefined
      }
    />
  );
}
