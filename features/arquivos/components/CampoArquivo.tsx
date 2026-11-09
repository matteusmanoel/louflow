'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mostrarFeedback } from '@/lib/toast';
import {
  LIMITE_ARQUIVOS,
  ROTULO_TAMANHO_MAXIMO,
  TAMANHO_MAXIMO_BYTES,
  TIPOS_ARQUIVO,
  type GrupoArquivo,
  type TipoArquivo,
} from '@/lib/armazenamento-chave';
import { prepararUpload } from '../actions';
import type { ItemArquivo } from '../schema';

type Props = {
  id: string;
  name?: string;
  rotulo: string;
  grupo: GrupoArquivo;
  donoId: string;
  valor?: string;
  valorInicial?: string;
  aoMudar?: (valor: string) => void;
  arquivos?: ItemArquivo[];
  aoMudarArquivos?: (arquivos: ItemArquivo[]) => void;
  obrigatorio?: boolean;
  placeholder?: string;
};

function tipoAceito(tipo: string): tipo is TipoArquivo {
  return (TIPOS_ARQUIVO as readonly string[]).includes(tipo);
}

export function CampoArquivo({
  id,
  name,
  rotulo,
  grupo,
  donoId,
  valor,
  valorInicial = '',
  aoMudar,
  arquivos,
  aoMudarArquivos,
  obrigatorio = false,
  placeholder = 'https://',
}: Props) {
  const arquivoRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const [enviadosInternos, setEnviadosInternos] = useState<ItemArquivo[]>([]);
  const enviados = arquivos ?? enviadosInternos;
  const [progresso, setProgresso] = useState<{ atual: number; total: number } | null>(null);
  const controlado = valor !== undefined;
  const enviando = progresso != null;
  const pasta = grupo === 'demandas' ? 'Demanda' : 'Corte';

  function publicarLink(proximo: string) {
    aoMudar?.(proximo);
  }

  function publicarArquivos(lista: ItemArquivo[]) {
    if (arquivos === undefined) setEnviadosInternos(lista);
    aoMudarArquivos?.(lista);
  }

  function remover(url: string) {
    publicarArquivos(enviados.filter((arquivo) => arquivo.url !== url));
  }

  async function aoEscolher(lista: FileList | null) {
    const arquivos = lista ? Array.from(lista) : [];
    if (arquivos.length === 0) return;
    if (enviados.length + arquivos.length > LIMITE_ARQUIVOS) {
      mostrarFeedback({ ok: false, mensagem: `São permitidos até ${LIMITE_ARQUIVOS} arquivos.` });
      return;
    }

    const aceitos: File[] = [];
    for (const arquivo of arquivos) {
      if (!tipoAceito(arquivo.type)) {
        mostrarFeedback({ ok: false, mensagem: `Tipo de arquivo não aceito: ${arquivo.name}.` });
        continue;
      }
      if (arquivo.size <= 0 || arquivo.size > TAMANHO_MAXIMO_BYTES) {
        mostrarFeedback({ ok: false, mensagem: `${arquivo.name} passa de ${ROTULO_TAMANHO_MAXIMO}.` });
        continue;
      }
      aceitos.push(arquivo);
    }
    if (aceitos.length === 0) return;

    const gravados = [...enviados];
    const quantidadeInicial = enviados.length;
    setProgresso({ atual: 1, total: aceitos.length });
    try {
      for (let indice = 0; indice < aceitos.length; indice += 1) {
        const arquivo = aceitos[indice]!;
        setProgresso({ atual: indice + 1, total: aceitos.length });
        const resultado = await prepararUpload({
          grupo,
          donoId,
          nomeArquivo: arquivo.name,
          tipo: arquivo.type,
          tamanho: arquivo.size,
        });
        if (!resultado.ok || !resultado.dados) {
          mostrarFeedback(resultado);
          break;
        }
        const envio = await fetch(resultado.dados.urlEnvio, {
          method: 'PUT',
          body: arquivo,
          headers: { 'Content-Type': arquivo.type },
        });
        if (!envio.ok) {
          mostrarFeedback({
            ok: false,
            mensagem: `Não foi possível enviar ${arquivo.name}. Cole um link ou tente de novo.`,
          });
          break;
        }
        gravados.push({
          url: resultado.dados.urlArquivo,
          nome: arquivo.name,
          tipo: arquivo.type as TipoArquivo,
          tamanho: arquivo.size,
        });
      }
    } finally {
      publicarArquivos(gravados);
      setProgresso(null);
      if (arquivoRef.current) arquivoRef.current.value = '';
      const enviadosAgora = gravados.length - quantidadeInicial;
      if (enviadosAgora === aceitos.length) {
        mostrarFeedback({
          ok: true,
          mensagem: enviadosAgora === 1 ? 'Arquivo enviado.' : `${enviadosAgora} arquivos enviados.`,
        });
      }
    }
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
        onChange={(evento) => {
          void aoEscolher(evento.target.files);
        }}
      />
      {enviados.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {enviados.map((arquivo) => (
            <li key={arquivo.url} className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm text-[var(--texto-forte)]">{arquivo.nome}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => remover(arquivo.url)}>
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="m-0 text-xs text-[var(--texto-suave)]">
        Cole um link ou escolha até {LIMITE_ARQUIVOS} arquivos de {ROTULO_TAMANHO_MAXIMO}. Eles ficam na pasta desta {pasta}.
      </p>
    </div>
  );
}
