'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, File, Folder, Loader2, Upload } from 'lucide-react';
import { listarPastaMidia } from '../actions';
import type { ItemMidia, VistaMidia } from '../consultas';
import { mensagemMidia, midiaAceita, type FormatoMidia } from '../schema';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import type { TipoArquivo } from '@/lib/armazenamento-chave';
import { mostrarFeedback } from '@/lib/toast';
import { descartarUploads } from '@/features/arquivos/actions';
import { publicarArquivos } from '@/features/arquivos/publicar';
import { selecionarArquivos } from '@/features/arquivos/selecao';
import { confirmarUploadsDrive, prepararUploadDrive } from '@/features/drive/actions';
import { formatarTamanho, rotuloTipo } from '@/features/drive/formato';

const ACEITE: Record<FormatoMidia, string> = {
  imagem: 'image/jpeg',
  reel: 'video/mp4,video/quicktime',
  story: 'image/jpeg,video/mp4,video/quicktime',
};

export function SeletorMidia({
  aberto,
  formato,
  aoFechar,
  aoEscolher,
}: {
  aberto: boolean;
  formato: FormatoMidia;
  aoFechar: () => void;
  aoEscolher: (arquivo: { id: string; nome: string; mime: string }) => void;
}) {
  const [pastaId, setPastaId] = useState<string | null>(null);
  const [vista, setVista] = useState<VistaMidia | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    void listarPastaMidia(pastaId).then((resultado) => {
      if (!vivo) return;
      setCarregando(false);
      if (!resultado.ok || !resultado.dados) {
        setVista(null);
        setErro(resultado.mensagem);
        return;
      }
      setErro(null);
      setVista(resultado.dados);
    });
    return () => {
      vivo = false;
    };
  }, [aberto, pastaId]);

  function fechar() {
    if (enviando) return;
    aoFechar();
  }

  function abrirPasta(id: string | null) {
    setCarregando(true);
    setErro(null);
    setPastaId(id);
  }

  function escolherItem(item: ItemMidia) {
    if (item.tipoItem === 'pasta') {
      abrirPasta(item.id);
      return;
    }
    if (!midiaAceita(formato, item.mime)) {
      mostrarFeedback({ ok: false, mensagem: mensagemMidia(formato) });
      return;
    }
    aoEscolher({ id: item.id, nome: item.nome, mime: item.mime ?? '' });
    aoFechar();
  }

  async function enviarArquivo(lista: FileList | null) {
    const arquivo = lista?.[0];
    if (entrada.current) entrada.current.value = '';
    if (!arquivo) return;
    if ((lista?.length ?? 0) > 1) {
      mostrarFeedback({ ok: false, mensagem: 'Escolha um arquivo por vez.' });
      return;
    }
    if (!midiaAceita(formato, arquivo.type)) {
      mostrarFeedback({ ok: false, mensagem: mensagemMidia(formato) });
      return;
    }
    const avaliacao = selecionarArquivos(0, [{ name: arquivo.name, type: arquivo.type, size: arquivo.size }]);
    if (avaliacao.indices.length === 0) {
      for (const mensagem of avaliacao.erros) mostrarFeedback({ ok: false, mensagem });
      return;
    }

    setEnviando(true);
    const resultado = await publicarArquivos({
      pendentes: [
        {
          id: crypto.randomUUID(),
          nome: arquivo.name,
          tipo: arquivo.type as TipoArquivo,
          tamanho: arquivo.size,
          arquivo,
        },
      ],
      descartar: async (urls) => {
        await descartarUploads({ urls: [...urls] });
      },
      enviar: async (pendente) => {
        const preparado = await prepararUploadDrive({
          pastaId,
          nomeArquivo: pendente.nome,
          tipo: pendente.tipo,
          tamanho: pendente.tamanho,
        });
        if (!preparado.ok || !preparado.dados) return { ok: false, mensagem: preparado.mensagem };
        const envio = await fetch(preparado.dados.urlEnvio, {
          method: 'PUT',
          body: pendente.arquivo,
          headers: { 'Content-Type': pendente.tipo },
        });
        if (!envio.ok) {
          return {
            ok: false,
            mensagem: `Não foi possível enviar ${pendente.nome}. Tente de novo.`,
            urlParcial: preparado.dados.urlArquivo,
          };
        }
        return {
          ok: true,
          item: {
            url: preparado.dados.urlArquivo,
            nome: pendente.nome,
            tipo: pendente.tipo,
            tamanho: pendente.tamanho,
          },
        };
      },
      persistir: (arquivos) => confirmarUploadsDrive({ pastaId, arquivos: [...arquivos] }),
    });
    setEnviando(false);
    if (!resultado.ok) {
      mostrarFeedback(resultado);
      return;
    }
    const id = resultado.dados?.ids[0];
    if (!id) {
      mostrarFeedback({ ok: false, mensagem: 'O arquivo não foi gravado no Drive.' });
      return;
    }
    mostrarFeedback(resultado);
    aoEscolher({ id, nome: arquivo.name, mime: arquivo.type });
    aoFechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={(visivel) => { if (!visivel) fechar(); }}>
      <DialogContent className="flex max-h-[min(85vh,40rem)] max-w-lg flex-col gap-4 overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Escolher mídia</DialogTitle>
          <DialogDescription>
            {vista ? `Envios entram em ${vista.nome}.` : 'Abra uma pasta do Drive ou envie um arquivo.'} {mensagemMidia(formato)}
          </DialogDescription>
        </DialogHeader>
        <nav aria-label="Caminho da pasta" className="flex items-center gap-1 overflow-x-auto text-sm">
          {(vista?.trilha ?? [{ id: null, nome: 'Drive' }]).map((parte, indice, trilha) => (
            <span key={`${parte.id ?? 'raiz'}-${indice}`} className="flex items-center gap-1">
              {indice > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--texto-suave)]" aria-hidden />}
              <button
                type="button"
                className="shrink-0 rounded-[var(--raio-botao-neutro)] px-1.5 py-0.5 hover:bg-[var(--accent)] disabled:opacity-70"
                disabled={enviando || indice === trilha.length - 1}
                onClick={() => abrirPasta(parte.id)}
              >
                {parte.nome}
              </button>
            </span>
          ))}
        </nav>
        <div className="min-h-40 flex-1 overflow-y-auto rounded-[var(--raio-card)] border border-[var(--border)]" aria-busy={carregando}>
          {carregando && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--texto-suave)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Carregando…
            </div>
          )}
          {!carregando && erro && <p className="px-4 py-8 text-center text-sm text-[var(--destructive)]">{erro}</p>}
          {!carregando && !erro && vista && vista.itens.length === 0 && (
            <EstadoVazio icone={Folder} titulo="Pasta vazia" descricao="Envie um arquivo para esta pasta." className="py-8" />
          )}
          {!carregando && !erro && vista && vista.itens.length > 0 && (
            <ul className="divide-y divide-[var(--border)]">
              {vista.itens.map((item) => {
                const compativel = item.tipoItem === 'pasta' || midiaAceita(formato, item.mime);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={enviando || !compativel}
                      title={compativel ? undefined : mensagemMidia(formato)}
                      onClick={() => escolherItem(item)}
                    >
                      {item.tipoItem === 'pasta' ? (
                        <Folder className="h-4 w-4 shrink-0 text-[var(--texto-suave)]" aria-hidden />
                      ) : (
                        <File className="h-4 w-4 shrink-0 text-[var(--texto-suave)]" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1 truncate">{item.nome}</span>
                      <span className="shrink-0 text-xs text-[var(--texto-suave)]">
                        {item.tipoItem === 'arquivo' && item.tamanho != null
                          ? formatarTamanho(item.tamanho)
                          : rotuloTipo(item)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <input
            ref={entrada}
            type="file"
            accept={ACEITE[formato]}
            className="sr-only"
            aria-label="Enviar arquivo para a pasta aberta"
            disabled={enviando}
            onChange={(evento) => void enviarArquivo(evento.target.files)}
          />
          <Button type="button" variant="outline" disabled={enviando} onClick={() => entrada.current?.click()}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
            {enviando ? 'Enviando…' : 'Enviar para esta pasta'}
          </Button>
          <Button type="button" variant="ghost" disabled={enviando} onClick={fechar}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
