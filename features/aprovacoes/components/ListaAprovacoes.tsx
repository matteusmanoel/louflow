'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, File, Loader2 } from 'lucide-react';
import { aprovarEntrega, reprovarEntrega } from '../actions';
import { classeMidia, ModalAgendarEntrega, type AssetEntrega } from './ModalAgendarEntrega';
import type { LinkEntrega } from '../link-entrega';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { mostrarFeedback } from '@/lib/toast';

export type AprovacaoVisivel = {
  entregaId: string;
  demandaId: string;
  demandaTitulo: string;
  versao: number;
  editorNome: string | null;
  nota: string | null;
  podeAjustar: boolean;
  podeAgendar: boolean;
  arquivos: AssetEntrega[];
  link: LinkEntrega | null;
};

export function ListaAprovacoes({
  itens,
  contas,
}: {
  itens: AprovacaoVisivel[];
  contas: { id: string; username: string }[];
}) {
  const router = useRouter();
  const [agendamento, setAgendamento] = useState<AprovacaoVisivel | null>(null);
  const [ajuste, setAjuste] = useState<AprovacaoVisivel | null>(null);
  const [motivo, setMotivo] = useState('');
  const [pendente, setPendente] = useState<string | null>(null);
  const [preview, setPreview] = useState<AssetEntrega | null>(null);

  async function aprovar(item: AprovacaoVisivel) {
    setPendente(item.entregaId);
    const resultado = await aprovarEntrega({ entregaId: item.entregaId });
    setPendente(null);
    mostrarFeedback(resultado);
    if (!resultado.ok) return;
    if (item.podeAgendar) setAgendamento(item);
    router.refresh();
  }

  async function pedirAjuste() {
    if (!ajuste || motivo.trim().length === 0) return;
    setPendente(ajuste.entregaId);
    const resultado = await reprovarEntrega({ entregaId: ajuste.entregaId, motivoRejeicao: motivo.trim() });
    setPendente(null);
    mostrarFeedback(resultado);
    if (!resultado.ok) return;
    setAjuste(null);
    setMotivo('');
    router.refresh();
  }

  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {itens.map((item) => (
          <li key={item.entregaId}>
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-[var(--texto-forte)]">{item.demandaTitulo}</CardTitle>
                <CardDescription>
                  <span className="fonte-numero">v{item.versao}</span>
                  {item.editorNome ? <span> · {item.editorNome}</span> : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {item.arquivos.length > 0 && (
                  <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3">
                    {item.arquivos.map((arquivo) => {
                      const classe = classeMidia(arquivo.mime, arquivo.nome);
                      return (
                        <li key={arquivo.id}>
                          <button
                            type="button"
                            className="flex w-full flex-col overflow-hidden rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] text-left"
                            onClick={() => setPreview(arquivo)}
                          >
                            <span className="flex aspect-video items-center justify-center overflow-hidden bg-[var(--fundo-app)]">
                              {classe === 'imagem' ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={arquivo.url} alt="" className="h-full w-full object-cover" />
                              ) : classe === 'video' ? (
                                <video src={arquivo.url} muted preload="metadata" playsInline className="pointer-events-none h-full w-full object-cover" />
                              ) : (
                                <File className="h-8 w-8 text-[var(--texto-suave)]" aria-hidden />
                              )}
                            </span>
                            <span className="truncate px-2 py-1.5 text-xs text-[var(--texto-forte)]">{arquivo.nome}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {item.link && (
                  <a
                    href={item.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit max-w-full items-center gap-2 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] px-3 py-2 text-sm text-[var(--texto-forte)] no-underline hover:underline"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">Abrir entrega · {item.link.rotulo}</span>
                  </a>
                )}
                {item.nota ? <p className="m-0 text-sm text-[var(--texto-suave)]">{item.nota}</p> : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" disabled={pendente === item.entregaId} onClick={() => void aprovar(item)}>
                    {pendente === item.entregaId && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    Aprovar
                  </Button>
                  {item.podeAjustar && (
                    <Button type="button" variant="outline" disabled={pendente === item.entregaId} onClick={() => { setAjuste(item); setMotivo(''); }}>
                      Solicitar ajuste
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <Dialog open={preview != null} onOpenChange={(visivel) => { if (!visivel) setPreview(null); }}>
        <DialogContent className="max-w-4xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{preview.nome}</DialogTitle>
              </DialogHeader>
              {classeMidia(preview.mime, preview.nome) === 'imagem' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.nome} className="max-h-[70vh] w-full object-contain" />
              ) : classeMidia(preview.mime, preview.nome) === 'video' ? (
                <video src={preview.url} controls autoPlay className="max-h-[70vh] w-full" />
              ) : (
                <DialogDescription>Este arquivo abre pelo link da entrega.</DialogDescription>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={ajuste != null} onOpenChange={(visivel) => { if (!visivel && !pendente) setAjuste(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar ajuste</DialogTitle>
            <DialogDescription>O editor recebe o motivo e a demanda volta para ajustes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-ajuste">Motivo</Label>
            <Textarea id="motivo-ajuste" value={motivo} onChange={(evento) => setMotivo(evento.target.value)} maxLength={1000} rows={4} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={pendente != null} onClick={() => setAjuste(null)}>Cancelar</Button>
            <Button type="button" disabled={pendente != null || motivo.trim().length === 0} onClick={() => void pedirAjuste()}>
              Enviar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {agendamento && (
        <ModalAgendarEntrega
          aberto
          demandaId={agendamento.demandaId}
          titulo={agendamento.demandaTitulo}
          arquivos={agendamento.arquivos}
          contas={contas}
          aoFechar={() => setAgendamento(null)}
        />
      )}
    </>
  );
}
