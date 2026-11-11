'use client';

import { useCallback, useImperativeHandle, useRef, useState, type ChangeEvent, type Ref } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mostrarFeedback } from '@/lib/toast';
import {
  LIMITE_ARQUIVOS,
  ROTULO_TAMANHO_MAXIMO,
  TIPOS_ARQUIVO,
  type GrupoArquivo,
} from '@/lib/armazenamento-chave';
import { descartarUploads, prepararUpload } from '../actions';
import { publicarArquivos } from '../publicar';
import { selecionarArquivos, type ArquivoPendente } from '../selecao';
import type { ItemArquivo } from '../schema';

export type CampoArquivoHandle = {
  enviar: <T extends { ok: boolean; mensagem: string }>(
    persistir: (arquivos: ItemArquivo[]) => Promise<T>,
  ) => Promise<T | { ok: false; mensagem: string }>;
  limpar: () => void;
};

type ResumoPendente = { id: string; nome: string };

type Props = {
  ref?: Ref<CampoArquivoHandle>;
  id: string;
  name?: string;
  rotulo: string;
  grupo: GrupoArquivo;
  donoId: string;
  valor?: string;
  valorInicial?: string;
  aoMudar?: (valor: string) => void;
  aoMudarPendentes?: (pendentes: ResumoPendente[]) => void;
  obrigatorio?: boolean;
  placeholder?: string;
};

export function CampoArquivo({
  ref,
  id,
  name,
  rotulo,
  grupo,
  donoId,
  valor,
  valorInicial = '',
  aoMudar,
  aoMudarPendentes,
  obrigatorio = false,
  placeholder = 'https://',
}: Props) {
  const arquivoRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const [pendentes, setPendentes] = useState<ArquivoPendente[]>([]);
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null);
  const controlado = valor !== undefined;
  const enviando = progresso != null;
  const pasta = grupo === 'demandas' ? 'Demanda' : 'Corte';

  const publicarPendentes = useCallback((lista: ArquivoPendente[]) => {
    setPendentes(lista);
    aoMudarPendentes?.(lista.map((item) => ({ id: item.id, nome: item.nome })));
  }, [aoMudarPendentes]);

  useImperativeHandle(ref, () => ({
    limpar: () => publicarPendentes([]),
    enviar: (persistir) =>
      publicarArquivos({
        pendentes,
        persistir,
        aoProgresso: (atual, total) => setProgresso({ atual, total }),
        descartar: async (urls) => {
          await descartarUploads({ urls: [...urls] });
        },
        enviar: async (pendente) => {
          const preparado = await prepararUpload({
            grupo,
            donoId,
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
              mensagem: `Não foi possível enviar ${pendente.nome}. Cole um link ou tente de novo.`,
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
      }).finally(() => setProgresso(null)),
  }), [pendentes, grupo, donoId, publicarPendentes]);

  function publicarLink(proximo: string) {
    aoMudar?.(proximo);
  }

  function aoEscolher(lista: FileList | null) {
    const arquivos = lista ? Array.from(lista) : [];
    if (arquivoRef.current) arquivoRef.current.value = '';
    const avaliacao = selecionarArquivos(
      pendentes.length,
      arquivos.map((arquivo) => ({ name: arquivo.name, type: arquivo.type, size: arquivo.size })),
    );
    for (const erro of avaliacao.erros) mostrarFeedback({ ok: false, mensagem: erro });
    if (avaliacao.indices.length === 0) return;
    publicarPendentes([
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

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="flex min-w-0 flex-col gap-2">
        {controlado ? (
          <Input
            ref={linkRef}
            id={id}
            name={name}
            type="url"
            required={obrigatorio}
            placeholder={placeholder}
            className="min-w-0"
            value={valor}
            onChange={(evento: ChangeEvent<HTMLInputElement>) => publicarLink(evento.target.value)}
          />
        ) : (
          <Input
            ref={linkRef}
            id={id}
            name={name}
            type="url"
            required={obrigatorio}
            placeholder={placeholder}
            className="min-w-0"
            defaultValue={valorInicial}
            onChange={(evento: ChangeEvent<HTMLInputElement>) => publicarLink(evento.target.value)}
          />
        )}
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={enviando}
          aria-busy={enviando}
          onClick={() => arquivoRef.current?.click()}
        >
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
          {enviando ? `Enviando ${progresso.atual} de ${progresso.total}…` : 'Escolher arquivos'}
        </Button>
      </div>
      <input
        ref={arquivoRef}
        type="file"
        multiple
        accept={TIPOS_ARQUIVO.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-label={`Arquivos para ${rotulo}`}
        onChange={(evento) => aoEscolher(evento.target.files)}
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
                onClick={() => publicarPendentes(pendentes.filter((item) => item.id !== arquivo.id))}
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="m-0 text-xs text-[var(--texto-suave)]">
        Cole um link ou escolha até {LIMITE_ARQUIVOS} arquivos de {ROTULO_TAMANHO_MAXIMO}. O envio para a pasta desta {pasta} acontece ao confirmar. Cancelar descarta a seleção.
      </p>
    </div>
  );
}
