'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mostrarFeedback } from '@/lib/toast';
import { enviarFichaTecnica } from '../actions';

type Props = { editores: { id: string; label: string }[] };
type Estado = { mensagem: string } | null;

const CAMPOS_TEXTO = [
  ['roteiro', 'Roteiro'],
  ['cabeca', 'Cabeça'],
  ['sonora', 'Sonora'],
  ['informacoes', 'Informações'],
  ['roteiroEscrito', 'Roteiro escrito'],
  ['gcLettering', 'GC / Lettering'],
  ['materialSsd', 'Material em SSD'],
  ['referenciasVisuais', 'Referências visuais'],
] as const;

const SELECT_CLASSE =
  'flex h-9 w-full rounded-[var(--raio-input)] border border-[var(--border)] bg-[var(--superficie)] px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]';

/** Envio da Ficha Técnica pelo Influencer (PRD §4.5). O servidor define o Influencer pela Sessão. */
export function FormEnviarFicha({ editores }: Props) {
  const router = useRouter();
  // Uma chave por formulário aberto: um duplo clique ou reenvio não cria outra Demanda.
  const [chaveEnvio] = useState(() => crypto.randomUUID());

  const acao = async (_anterior: Estado, form: FormData): Promise<Estado> => {
    const texto = (nome: string) => String(form.get(nome) ?? '');
    const resultado = await enviarFichaTecnica({
      chaveEnvio,
      identificacao: texto('identificacao'),
      observacaoEditor: texto('observacaoEditor'),
      previsaoPublicacao: texto('previsaoPublicacao'),
      roteiro: texto('roteiro'),
      cabeca: texto('cabeca'),
      sonora: texto('sonora'),
      informacoes: texto('informacoes'),
      linkArquivos: texto('linkArquivos'),
      roteiroEscrito: texto('roteiroEscrito'),
      gcLettering: texto('gcLettering'),
      materialSsd: texto('materialSsd'),
      plataforma: texto('plataforma'),
      formatoConteudo: texto('formatoConteudo'),
      referenciasVisuais: texto('referenciasVisuais'),
      editorSugeridoId: texto('editorSugeridoId'),
    });
    if (resultado.ok) {
      mostrarFeedback(resultado);
      router.push(`/demandas/${resultado.dados.demandaId}`);
      return null;
    }
    return { mensagem: resultado.mensagem };
  };

  const [estado, dispatch, pendente] = useActionState(acao, null);

  return (
    <form action={dispatch} className="flex flex-col gap-4" aria-label="Enviar ficha técnica">
      {estado && (
        <Alert variant="destructive">
          <AlertDescription>{estado.mensagem}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="identificacao">Identificação</Label>
        <Input id="identificacao" name="identificacao" required maxLength={300} placeholder="Ex.: Roteiro do passeio de catamarã" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observacaoEditor">
          Observação ao editor <span className="font-normal text-[var(--texto-suave)]">(opcional)</span>
        </Label>
        <Textarea id="observacaoEditor" name="observacaoEditor" rows={3} maxLength={2000} className="min-h-[72px] resize-y" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="previsaoPublicacao">Previsão de publicação</Label>
          <Input id="previsaoPublicacao" name="previsaoPublicacao" type="date" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="plataforma">Plataforma</Label>
          <Input id="plataforma" name="plataforma" maxLength={100} placeholder="Ex.: Instagram" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="formatoConteudo">Formato do conteúdo</Label>
          <Input id="formatoConteudo" name="formatoConteudo" maxLength={100} placeholder="Ex.: Reels" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="linkArquivos">Link de arquivos</Label>
          <Input id="linkArquivos" name="linkArquivos" type="url" placeholder="https://" />
        </div>
      </div>

      {CAMPOS_TEXTO.map(([nome, rotulo]) => (
        <div key={nome} className="space-y-1.5">
          <Label htmlFor={nome}>
            {rotulo} <span className="font-normal text-[var(--texto-suave)]">(opcional)</span>
          </Label>
          <Textarea id={nome} name={nome} rows={3} maxLength={5000} className="min-h-[72px] resize-y" />
        </div>
      ))}

      <div className="space-y-1.5">
        <Label htmlFor="editorSugeridoId">
          Editor sugerido <span className="font-normal text-[var(--texto-suave)]">(opcional)</span>
        </Label>
        <select id="editorSugeridoId" name="editorSugeridoId" className={SELECT_CLASSE} defaultValue="">
          <option value="">Sem sugestão</option>
          {editores.map((editor) => (
            <option key={editor.id} value={editor.id}>
              {editor.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pendente}>
          {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {pendente ? 'Enviando…' : 'Enviar ficha'}
        </Button>
      </div>
    </form>
  );
}
