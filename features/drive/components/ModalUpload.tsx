'use client';

import { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LIMITE_ARQUIVOS, ROTULO_TAMANHO_MAXIMO, TIPOS_ARQUIVO } from '@/lib/armazenamento-chave';
import { mostrarFeedback } from '@/lib/toast';
import { descartarUploads } from '@/features/arquivos/actions';
import { publicarArquivos } from '@/features/arquivos/publicar';
import { selecionarArquivos, type ArquivoPendente } from '@/features/arquivos/selecao';
import { confirmarUploadsDrive, prepararUploadDrive } from '../actions';

export function ModalUpload({
  aberto,
  pastaId,
  aoFechar,
  aoConcluir,
}: {
  aberto: boolean;
  pastaId: string | null;
  aoFechar: () => void;
  aoConcluir: () => void;
}) {
  const [pendentes, setPendentes] = useState<ArquivoPendente[]>([]);
  const [enviando, setEnviando] = useState(false);

  function fechar() {
    if (enviando) return;
    setPendentes([]);
    aoFechar();
  }

  function escolher(lista: FileList | null) {
    const arquivos = lista ? Array.from(lista) : [];
    const avaliacao = selecionarArquivos(
      pendentes.length,
      arquivos.map((arquivo) => ({ name: arquivo.name, type: arquivo.type, size: arquivo.size })),
    );
    for (const erro of avaliacao.erros) mostrarFeedback({ ok: false, mensagem: erro });
    if (avaliacao.indices.length === 0) return;
    setPendentes([
      ...pendentes,
      ...avaliacao.indices.map((indice, posicao) => {
        const arquivo = arquivos[indice]!;
        return {
          id: crypto.randomUUID(),
          nome: arquivo.name,
          tipo: avaliacao.tipos[posicao]!,
          tamanho: arquivo.size,
          arquivo,
        };
      }),
    ]);
  }

  async function enviar() {
    setEnviando(true);
    const resultado = await publicarArquivos({
      pendentes,
      aoProgresso: () => {},
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
    mostrarFeedback(resultado);
    if (resultado.ok) {
      setPendentes([]);
      aoConcluir();
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(visivel) => { if (!visivel) fechar(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar arquivos</DialogTitle>
          <DialogDescription>
            Até {LIMITE_ARQUIVOS} arquivos, cada um de no máximo {ROTULO_TAMANHO_MAXIMO}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button type="button" variant="outline" disabled={enviando} onClick={() => document.getElementById('drive-upload')?.click()}>
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
            Escolher arquivos
          </Button>
          <input
            id="drive-upload"
            type="file"
            multiple
            accept={TIPOS_ARQUIVO.join(',')}
            className="sr-only"
            aria-label="Arquivos para enviar"
            onChange={(evento) => {
              escolher(evento.target.files);
              evento.target.value = '';
            }}
          />
          {pendentes.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {pendentes.map((arquivo) => (
                <li key={arquivo.id} className="flex min-w-0 items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm text-[var(--texto-forte)]">{arquivo.nome}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={enviando}
                    onClick={() => setPendentes(pendentes.filter((item) => item.id !== arquivo.id))}
                  >
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={enviando} onClick={fechar}>Cancelar</Button>
          <Button type="button" disabled={enviando || pendentes.length === 0} onClick={() => void enviar()}>
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
