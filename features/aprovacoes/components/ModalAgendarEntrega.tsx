'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { agendarPublicacaoInstagram } from '@/features/instagram/actions';
import { FORMATOS, MARCAS, mensagemMidia, midiaAceita, type FormatoMidia } from '@/features/instagram/schema';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { mostrarFeedback } from '@/lib/toast';

const ROTULO_FORMATO = { imagem: 'Foto', reel: 'Reel', story: 'Story' } as const;

export type AssetEntrega = {
  id: string;
  nome: string;
  url: string;
  mime: string | null;
};

function formatoInicial(mime: string | null): FormatoMidia | '' {
  if (mime === 'image/jpeg') return 'imagem';
  if (mime === 'video/mp4' || mime === 'video/quicktime') return 'reel';
  return '';
}

export function ModalAgendarEntrega({
  aberto,
  demandaId,
  titulo,
  arquivos,
  contas,
  aoFechar,
}: {
  aberto: boolean;
  demandaId: string;
  titulo: string;
  arquivos: AssetEntrega[];
  contas: { id: string; username: string }[];
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [arquivoId, setArquivoId] = useState(arquivos[0]?.id ?? '');
  const arquivo = arquivos.find((item) => item.id === arquivoId) ?? arquivos[0];
  const [formato, setFormato] = useState<FormatoMidia | ''>(formatoInicial(arquivo?.mime ?? null));
  const [contaId, setContaId] = useState(contas[0]?.id ?? '');
  const [marca, setMarca] = useState<(typeof MARCAS)[number] | ''>('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);
  const compativel = Boolean(arquivo && formato && midiaAceita(formato, arquivo.mime));

  async function agendar(form: FormData) {
    if (!arquivo || !formato || !compativel) {
      setErro(formato ? mensagemMidia(formato) : 'Escolha o formato.');
      return;
    }
    setPendente(true);
    const resultado = await agendarPublicacaoInstagram({
      contaId,
      titulo: form.get('titulo'),
      legenda: form.get('legenda'),
      arquivoId: arquivo.id,
      demandaId,
      formato,
      marca,
      quando: form.get('quando'),
    });
    setPendente(false);
    mostrarFeedback(resultado);
    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }
    aoFechar();
    router.refresh();
  }

  return (
    <Dialog open={aberto} onOpenChange={(visivel) => { if (!visivel && !pendente) aoFechar(); }}>
      <DialogContent className="max-h-[min(85vh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agendar publicação</DialogTitle>
          <DialogDescription>
            A entrega aprovada entra na conta escolhida no horário de Brasília.
          </DialogDescription>
        </DialogHeader>
        <form action={agendar} className="flex flex-col gap-4">
          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2 overflow-x-auto">
            {arquivos.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === arquivo?.id}
                className="w-24 shrink-0 overflow-hidden rounded-[var(--raio-card)] border border-[var(--borda-app)] text-left aria-pressed:border-[var(--loumar-700)]"
                onClick={() => {
                  setArquivoId(item.id);
                  setFormato(formatoInicial(item.mime));
                }}
              >
                <Miniatura nome={item.nome} url={item.url} mime={item.mime} />
                <span className="block truncate px-1.5 py-1 text-[11px] text-[var(--texto-forte)]">{item.nome}</span>
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="titulo-agenda">Título</Label>
            <Input id="titulo-agenda" name="titulo" required maxLength={200} defaultValue={titulo} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Conta</Label>
              <Select value={contaId} onValueChange={setContaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a conta" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>@{conta.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Formato</Label>
              <Select value={formato || undefined} onValueChange={(valor) => setFormato(valor as FormatoMidia)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o formato" />
                </SelectTrigger>
                <SelectContent>
                  {FORMATOS.map((item) => (
                    <SelectItem key={item} value={item}>{ROTULO_FORMATO[item]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Select value={marca || undefined} onValueChange={(valor) => setMarca(valor as (typeof MARCAS)[number])}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha a marca" />
                </SelectTrigger>
                <SelectContent>
                  {MARCAS.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quando-agenda">Data e hora</Label>
              <Input id="quando-agenda" name="quando" type="datetime-local" required />
            </div>
          </div>
          {formato && arquivo && !compativel && (
            <p className="m-0 text-sm text-[var(--destructive)]">{mensagemMidia(formato)}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="legenda-agenda">Legenda</Label>
            <Textarea id="legenda-agenda" name="legenda" maxLength={2200} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pendente} onClick={aoFechar}>Agora não</Button>
            <Button type="submit" disabled={pendente || !compativel || contas.length === 0}>
              {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {pendente ? 'Agendando…' : 'Agendar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Miniatura({ nome, url, mime }: { nome: string; url: string; mime: string | null }) {
  const classe = classeMidia(mime, nome);
  return (
    <span className="flex aspect-video items-center justify-center bg-[var(--fundo-app)]">
      {classe === 'imagem' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : classe === 'video' ? (
        <video src={url} muted preload="metadata" playsInline className="pointer-events-none h-full w-full object-cover" />
      ) : (
        <span className="px-1 text-center text-[10px] text-[var(--texto-suave)]">Arquivo</span>
      )}
    </span>
  );
}

export function classeMidia(mime: string | null, nome: string): 'imagem' | 'video' | 'outro' {
  if (mime?.startsWith('image/')) return 'imagem';
  if (mime?.startsWith('video/')) return 'video';
  if (/\.(jpe?g|png|webp|gif)$/i.test(nome)) return 'imagem';
  if (/\.(mp4|mov|webm)$/i.test(nome)) return 'video';
  return 'outro';
}
