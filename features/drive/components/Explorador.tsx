'use client';

import { useMemo, useState, useTransition, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Download,
  FileArchive,
  FileAudio,
  FileText,
  FileVideo,
  Folder,
  FolderOpen,
  ImageIcon,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina';
import { ContainerPagina } from '@/components/ui/container-pagina';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mostrarFeedback, type ResultadoAcao } from '@/lib/toast';
import {
  criarPastaDrive,
  enviarLixeiraDrive,
  excluirDrive,
  moverDrive,
  renomearDrive,
  restaurarDrive,
} from '../actions';
import { formatarTamanho, rotuloTipo } from '../formato';
import type { CotaDrive, DestinoDrive, ItemDrive, TrilhaDrive } from '../tipos';
import { ModalUpload } from './ModalUpload';

type Visao = 'cards' | 'lista';
type Modo = 'explorar' | 'lixeira';

function classeMidia(tipo: string | null): 'imagem' | 'video' | 'outro' {
  if (!tipo || tipo === 'image/heic' || tipo === 'image/heif') return 'outro';
  if (tipo.startsWith('image/')) return 'imagem';
  if (tipo.startsWith('video/')) return 'video';
  return 'outro';
}

function IconeArquivo({ tipo, className = 'h-8 w-8' }: { tipo: string | null; className?: string }) {
  const Icone = !tipo
    ? FileText
    : tipo.startsWith('audio/')
      ? FileAudio
      : tipo === 'application/pdf'
        ? FileText
        : tipo.includes('zip')
          ? FileArchive
          : tipo.startsWith('video/')
            ? FileVideo
            : ImageIcon;
  return <Icone className={`${className} text-[var(--texto-suave)]`} aria-hidden />;
}

function Medidor({ cota }: { cota: CotaDrive }) {
  const pct = cota.limite <= 0 ? 100 : Math.min(100, Math.round((cota.usado / cota.limite) * 100));
  const cheio = cota.usado >= cota.limite;
  const livres = Math.max(0, cota.limite - cota.usado);
  return (
    <div className="min-w-[12rem] flex-1">
      <div className="mb-1 flex justify-between gap-3 text-xs text-[var(--texto-suave)]">
        <span>{formatarTamanho(cota.usado)} de {formatarTamanho(cota.limite)}</span>
        <span>{cheio ? 'Cota esgotada' : `${formatarTamanho(livres)} livres`}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--fundo-app)]"
        role="meter"
        aria-label="Armazenamento"
        aria-valuemin={0}
        aria-valuemax={cota.limite}
        aria-valuenow={Math.min(cota.usado, cota.limite)}
      >
        <div
          className={`h-full ${cheio ? 'bg-[var(--destructive)]' : 'bg-[var(--loumar-700)]'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Explorador({
  modo,
  caminho,
  visao,
  pastaId,
  nome,
  detalhe,
  trilha,
  itens,
  cota,
  destinos,
}: {
  modo: Modo;
  caminho: string;
  visao: Visao;
  pastaId: string | null;
  nome: string;
  detalhe: string | null;
  trilha: TrilhaDrive[];
  itens: ItemDrive[];
  cota: CotaDrive;
  destinos: DestinoDrive[];
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [upload, setUpload] = useState(false);
  const [criar, setCriar] = useState(false);
  const [renomearId, setRenomearId] = useState<string | null>(null);
  const [moverAberto, setMoverAberto] = useState(false);
  const [destino, setDestino] = useState<string | null>(destinos[0]?.id ?? null);
  const [nomeDialogo, setNomeDialogo] = useState('');
  const [excluir, setExcluir] = useState(false);
  const [apagar, setApagar] = useState(false);
  const [preview, setPreview] = useState<ItemDrive | null>(null);
  const [selecionando, setSelecionando] = useState(false);
  const [ancora, setAncora] = useState<number | null>(null);

  const escolhidos = useMemo(() => itens.filter((item) => selecao.has(item.id)), [itens, selecao]);
  const temFixa = escolhidos.some((item) => item.fixa);
  const umEditavel = escolhidos.length === 1 && !escolhidos[0]?.fixa ? escolhidos[0] : null;
  const cotaCheia = cota.usado >= cota.limite;
  const todosMarcados = itens.length > 0 && itens.every((item) => selecao.has(item.id));

  function hrefVisao(proxima: Visao) {
    return proxima === 'lista' ? `${caminho}?visao=lista` : caminho;
  }

  function hrefPasta(id: string) {
    return visao === 'lista' ? `/drive/${id}?visao=lista` : `/drive/${id}`;
  }

  function alternarModo() {
    setSelecionando((atual) => !atual);
    setSelecao(new Set());
    setAncora(null);
  }

  function marcar(indice: number, intervalo: boolean) {
    const id = itens[indice]?.id;
    if (!id) return;
    setSelecao((atual) => {
      const proxima = new Set(atual);
      if (intervalo && ancora != null) {
        const inicio = Math.min(ancora, indice);
        const fim = Math.max(ancora, indice);
        for (let cursor = inicio; cursor <= fim; cursor += 1) {
          const item = itens[cursor];
          if (item) proxima.add(item.id);
        }
        return proxima;
      }
      if (proxima.has(id)) proxima.delete(id);
      else proxima.add(id);
      return proxima;
    });
    if (!intervalo) setAncora(indice);
  }

  function marcarTodos() {
    setSelecao(todosMarcados ? new Set() : new Set(itens.map((item) => item.id)));
  }

  function cliqueSelecao(evento: MouseEvent, indice: number) {
    evento.preventDefault();
    marcar(indice, evento.shiftKey);
  }

  function executar(acao: () => Promise<ResultadoAcao>, fechar?: () => void) {
    iniciar(async () => {
      const resultado = await acao();
      mostrarFeedback(resultado);
      if (!resultado.ok) return;
      setSelecao(new Set());
      setAncora(null);
      fechar?.();
      router.refresh();
    });
  }

  async function baixar(ids: string[]) {
    const arquivos = itens.filter((item) => ids.includes(item.id));
    if (arquivos.length === 1 && arquivos[0]?.tipoItem === 'arquivo' && arquivos[0].urlDownload) {
      window.open(arquivos[0].urlDownload, '_blank', 'noopener,noreferrer');
      return;
    }
    const resposta = await fetch('/api/drive/zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!resposta.ok) {
      const json = await resposta.json().catch(() => ({ mensagem: 'Não foi possível baixar os arquivos.' })) as { mensagem?: string };
      mostrarFeedback({ ok: false, mensagem: json.mensagem });
      return;
    }
    const blob = await resposta.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'drive.zip';
    link.click();
    URL.revokeObjectURL(url);
  }

  function abrirItem(item: ItemDrive) {
    if (item.tipoItem === 'pasta') return;
    if (classeMidia(item.mime) !== 'outro') setPreview(item);
    else if (item.urlDownload) window.open(item.urlDownload, '_blank', 'noopener,noreferrer');
  }

  const ids = escolhidos.map((item) => item.id);
  const destinosMove = destinos.filter((item) => item.id == null || !selecao.has(item.id));

  return (
    <ContainerPagina>
      <nav aria-label="Trilha" className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-[var(--texto-suave)]">
        {trilha.map((passo, indice) => {
          const atual = indice === trilha.length - 1;
          const href = passo.id == null ? '/drive' : passo.id === 'lixeira' ? '/drive/lixeira' : `/drive/${passo.id}`;
          return (
            <span key={`${passo.nome}-${indice}`} className="flex min-w-0 items-center gap-1">
              {indice > 0 && <span aria-hidden>/</span>}
              {atual ? (
                <span className="truncate text-[var(--texto-forte)]">{passo.nome}</span>
              ) : (
                <Link href={visao === 'lista' ? `${href}?visao=lista` : href} className="truncate text-[var(--loumar-700)] no-underline hover:underline">
                  {passo.nome}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <CabecalhoPagina
        grupo="Produção"
        titulo={nome}
        descricao={detalhe ?? undefined}
        acao={modo === 'explorar' ? (
          <>
            <Button type="button" variant="outline" disabled={pendente} onClick={() => { setNomeDialogo(''); setCriar(true); }}>
              <Folder className="h-4 w-4" aria-hidden />
              Nova pasta
            </Button>
            <Button type="button" disabled={pendente || cotaCheia} onClick={() => setUpload(true)}>
              <Upload className="h-4 w-4" aria-hidden />
              Enviar
            </Button>
          </>
        ) : (
          <Button variant="outline" asChild>
            <Link href={visao === 'lista' ? '/drive?visao=lista' : '/drive'}>Voltar ao Drive</Link>
          </Button>
        )}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Medidor cota={cota} />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant={selecionando ? 'default' : 'outline'} size="sm" aria-pressed={selecionando} disabled={pendente || itens.length === 0} onClick={alternarModo}>
            Selecionar
          </Button>
          {selecionando && (
            <Button type="button" variant="outline" size="sm" disabled={pendente} onClick={marcarTodos}>
              Selecionar todos
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={pendente || ids.length === 0 || (modo === 'lixeira' && (ids.length !== 1 || escolhidos[0]?.tipoItem !== 'arquivo'))} onClick={() => void baixar(ids)}>
            <Download className="h-4 w-4" aria-hidden />
            Baixar
          </Button>
          {modo === 'explorar' ? (
            <>
              <Button type="button" variant="outline" size="sm" disabled={pendente || !umEditavel} onClick={() => { setNomeDialogo(umEditavel?.nome ?? ''); setRenomearId(umEditavel?.id ?? null); }}>
                <Pencil className="h-4 w-4" aria-hidden />
                Renomear
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={pendente || ids.length === 0 || temFixa} onClick={() => { setDestino(destinosMove[0]?.id ?? null); setMoverAberto(true); }}>
                Mover
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={pendente || ids.length === 0 || temFixa} onClick={() => setExcluir(true)}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Excluir
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={visao === 'lista' ? '/drive/lixeira?visao=lista' : '/drive/lixeira'}>Lixeira</Link>
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" size="sm" disabled={pendente || ids.length === 0} onClick={() => executar(() => restaurarDrive({ ids }))}>
                Restaurar
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={pendente || ids.length === 0} onClick={() => setApagar(true)}>
                Excluir agora
              </Button>
            </>
          )}
          <div className="flex rounded-[var(--raio-botao)] border border-[var(--borda-app)]">
            <Link href={hrefVisao('cards')} aria-label="Ver em cards" aria-pressed={visao === 'cards'} className={`inline-flex h-7 w-7 items-center justify-center ${visao === 'cards' ? 'bg-[var(--accent)] text-[var(--texto-forte)]' : 'text-[var(--texto-suave)]'}`}>
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </Link>
            <Link href={hrefVisao('lista')} aria-label="Ver em lista" aria-pressed={visao === 'lista'} className={`inline-flex h-7 w-7 items-center justify-center ${visao === 'lista' ? 'bg-[var(--accent)] text-[var(--texto-forte)]' : 'text-[var(--texto-suave)]'}`}>
              <List className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      {itens.length === 0 ? (
        <EstadoVazio
          icone={modo === 'lixeira' ? Trash2 : FolderOpen}
          titulo={modo === 'lixeira' ? 'Lixeira vazia' : 'Pasta vazia'}
          descricao={modo === 'lixeira' ? 'Os itens excluídos aparecem aqui por 30 dias.' : 'Crie uma pasta ou envie arquivos.'}
        />
      ) : visao === 'lista' ? (
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--borda-app)] text-left text-xs text-[var(--texto-suave)]">
                {selecionando && (
                  <th className="w-10 px-2 py-2">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos"
                      checked={todosMarcados}
                      onClick={(evento) => {
                        evento.preventDefault();
                        marcarTodos();
                      }}
                      onChange={() => {}}
                    />
                  </th>
                )}
                <th className="px-2 py-2 font-medium">Nome</th>
                <th className="hidden w-24 px-2 py-2 font-medium sm:table-cell">Tipo</th>
                <th className="hidden w-24 px-2 py-2 font-medium sm:table-cell">Tamanho</th>
                <th className="hidden w-28 px-2 py-2 font-medium sm:table-cell">{modo === 'lixeira' ? 'Excluído em' : 'Enviado em'}</th>
                <th className="w-12 px-2 py-2"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, indice) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--borda-app)]"
                  onMouseDown={selecionando ? (evento) => { if (evento.shiftKey) evento.preventDefault(); } : undefined}
                  onClick={selecionando ? (evento) => cliqueSelecao(evento, indice) : undefined}
                >
                  {selecionando && (
                    <td className="px-2 py-2" onClick={(evento) => evento.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${item.nome}`}
                        checked={selecao.has(item.id)}
                        onClick={(evento) => {
                          evento.preventDefault();
                          marcar(indice, evento.shiftKey);
                        }}
                        onChange={() => {}}
                      />
                    </td>
                  )}
                  <td className="px-2 py-2">
                    <NomeItem
                      item={item}
                      href={!selecionando && item.tipoItem === 'pasta' && modo === 'explorar' ? hrefPasta(item.id) : null}
                      aoAbrir={selecionando ? undefined : () => abrirItem(item)}
                    />
                  </td>
                  <td className="hidden whitespace-nowrap px-2 py-2 text-[var(--texto-suave)] sm:table-cell">{rotuloTipo(item)}</td>
                  <td className="fonte-numero hidden whitespace-nowrap px-2 py-2 text-[var(--texto-suave)] sm:table-cell">
                    {item.tamanho == null ? '—' : formatarTamanho(item.tamanho)}
                  </td>
                  <td className="hidden whitespace-nowrap px-2 py-2 text-[var(--texto-suave)] sm:table-cell">{item.apagadoEm ?? item.criadoEm}</td>
                  <td className="px-2 py-2 text-right" onClick={(evento) => evento.stopPropagation()}>
                    <MenuItem
                      item={item}
                      modo={modo}
                      onBaixar={() => void baixar([item.id])}
                      onRenomear={() => { setNomeDialogo(item.nome); setRenomearId(item.id); }}
                      onMover={() => { setSelecao(new Set([item.id])); setDestino(destinos[0]?.id ?? null); setMoverAberto(true); }}
                      onExcluir={() => { setSelecao(new Set([item.id])); setExcluir(true); }}
                      onRestaurar={() => executar(() => restaurarDrive({ ids: [item.id] }))}
                      onApagar={() => { setSelecao(new Set([item.id])); setApagar(true); }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
          {itens.map((item, indice) => (
            <li key={item.id} className="relative">
              {selecionando && (
                <input
                  type="checkbox"
                  aria-label={`Selecionar ${item.nome}`}
                  checked={selecao.has(item.id)}
                  onClick={(evento) => {
                    evento.preventDefault();
                    evento.stopPropagation();
                    marcar(indice, evento.shiftKey);
                  }}
                  onChange={() => {}}
                  className="absolute left-2 top-2 z-10"
                />
              )}
              <Cartao
                item={item}
                marcado={selecionando && selecao.has(item.id)}
                href={!selecionando && item.tipoItem === 'pasta' && modo === 'explorar' ? hrefPasta(item.id) : null}
                aoAbrir={() => abrirItem(item)}
                aoSelecionar={selecionando ? (evento) => cliqueSelecao(evento, indice) : null}
              />
            </li>
          ))}
        </ul>
      )}

      <ModalUpload aberto={upload} pastaId={pastaId} aoFechar={() => setUpload(false)} aoConcluir={() => { setUpload(false); router.refresh(); }} />

      <Dialog open={criar || renomearId != null} onOpenChange={(visivel) => { if (!visivel) { setCriar(false); setRenomearId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{renomearId ? 'Renomear' : 'Nova pasta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="nome-drive">Nome</Label>
            <Input id="nome-drive" value={nomeDialogo} maxLength={180} onChange={(evento) => setNomeDialogo(evento.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pendente} onClick={() => { setCriar(false); setRenomearId(null); }}>Cancelar</Button>
            <Button
              type="button"
              disabled={pendente || nomeDialogo.trim().length === 0}
              onClick={() => executar(
                () => renomearId
                  ? renomearDrive({ id: renomearId, nome: nomeDialogo.trim() })
                  : criarPastaDrive({ pastaId, nome: nomeDialogo.trim() }),
                () => { setCriar(false); setRenomearId(null); },
              )}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moverAberto} onOpenChange={setMoverAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover para</DialogTitle>
          </DialogHeader>
          <ul className="m-0 flex max-h-64 list-none flex-col gap-1 overflow-y-auto p-0">
            {destinosMove.map((item) => (
              <li key={item.id ?? 'raiz'}>
                <label className="flex min-w-0 cursor-pointer items-center gap-2 rounded-[var(--raio-card)] px-2 py-1.5 text-sm hover:bg-[var(--accent)]">
                  <input
                    type="radio"
                    name="destino-drive"
                    checked={destino === item.id}
                    onChange={() => setDestino(item.id)}
                  />
                  <span className="truncate">{item.rotulo}</span>
                </label>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pendente} onClick={() => setMoverAberto(false)}>Cancelar</Button>
            <Button type="button" disabled={pendente} onClick={() => executar(() => moverDrive({ ids, pastaId: destino }), () => setMoverAberto(false))}>
              Mover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={excluir} onOpenChange={setExcluir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar para a lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              Os itens ficam 30 dias na lixeira e depois são apagados. Dá para restaurar antes disso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
            <Button type="button" disabled={pendente} onClick={() => executar(() => enviarLixeiraDrive({ ids }), () => setExcluir(false))}>
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={apagar} onOpenChange={setApagar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agora?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação apaga os arquivos do armazenamento e não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={pendente} onClick={() => executar(() => excluirDrive({ ids }), () => setApagar(false))}>
              Excluir agora
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={preview != null} onOpenChange={(visivel) => { if (!visivel) setPreview(null); }}>
        <DialogContent className="max-w-4xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{preview.nome}</DialogTitle>
              </DialogHeader>
              <div className="flex h-[min(70vh,32rem)] items-center justify-center">
                {classeMidia(preview.mime) === 'imagem' ? (
                  // URL assinada e temporária: o otimizador de imagem não consegue revalidá-la.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview.url ?? ''} alt={preview.nome} className="h-full w-full object-contain" />
                ) : (
                  <video src={preview.url ?? ''} controls autoPlay className="h-full w-full" />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ContainerPagina>
  );
}

function NomeItem({ item, href, aoAbrir }: { item: ItemDrive; href: string | null; aoAbrir?: () => void }) {
  const conteudo = (
    <span className="flex min-w-0 items-center gap-2">
      {item.tipoItem === 'pasta' ? <Folder className="h-4 w-4 shrink-0 text-[var(--loumar-700)]" aria-hidden /> : <IconeArquivo tipo={item.mime} className="h-4 w-4 shrink-0" />}
      <span className="truncate text-[var(--texto-forte)]">{item.nome}</span>
    </span>
  );
  if (href) return <Link href={href} className="no-underline">{conteudo}</Link>;
  if (item.tipoItem === 'arquivo' && aoAbrir) {
    return <button type="button" className="max-w-full text-left" onClick={aoAbrir}>{conteudo}</button>;
  }
  return conteudo;
}

function Cartao({
  item,
  href,
  aoAbrir,
  aoSelecionar,
  marcado,
}: {
  item: ItemDrive;
  href: string | null;
  aoAbrir: () => void;
  aoSelecionar: ((evento: MouseEvent<HTMLButtonElement>) => void) | null;
  marcado: boolean;
}) {
  const midia = classeMidia(item.mime);
  const moldura = `flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--raio-card)] border bg-[var(--superficie)] text-left shadow-[var(--sombra-card)] no-underline ${marcado ? 'border-[var(--loumar-700)]' : 'border-[var(--borda-app)]'}`;
  const quadro = (
    <span className="flex aspect-video items-center justify-center overflow-hidden bg-[var(--fundo-app)]">
      {item.tipoItem === 'pasta' ? (
        <Folder className="h-8 w-8 text-[var(--loumar-700)]" aria-hidden />
      ) : midia === 'imagem' && item.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt="" className="h-full w-full object-cover" />
      ) : midia === 'video' && item.url ? (
        <video src={item.url} muted preload="metadata" playsInline className="pointer-events-none h-full w-full object-cover" />
      ) : (
        <IconeArquivo tipo={item.mime} />
      )}
    </span>
  );
  const legenda = (
    <span className="flex flex-col px-3 py-2">
      <span className="truncate text-sm text-[var(--texto-forte)]">{item.nome}</span>
      <span className="fonte-numero text-xs text-[var(--texto-suave)]">
        {item.tamanho == null ? 'Pasta' : formatarTamanho(item.tamanho)}
      </span>
    </span>
  );
  if (aoSelecionar) {
    return (
      <button
        type="button"
        className={`${moldura} w-full`}
        onMouseDown={(evento) => { if (evento.shiftKey) evento.preventDefault(); }}
        onClick={aoSelecionar}
        aria-pressed={marcado}
      >
        {quadro}
        {legenda}
      </button>
    );
  }
  if (href) {
    return <Link href={href} className={moldura}>{quadro}{legenda}</Link>;
  }
  return (
    <button type="button" className={`${moldura} w-full`} onClick={aoAbrir} aria-label={`Ver ${item.nome}`}>
      {quadro}
      {legenda}
    </button>
  );
}

function MenuItem({
  item,
  modo,
  onBaixar,
  onRenomear,
  onMover,
  onExcluir,
  onRestaurar,
  onApagar,
}: {
  item: ItemDrive;
  modo: Modo;
  onBaixar: () => void;
  onRenomear: () => void;
  onMover: () => void;
  onExcluir: () => void;
  onRestaurar: () => void;
  onApagar: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={`Ações de ${item.nome}`}>
          <MoreVertical className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {item.tipoItem === 'arquivo' && (
          <DropdownMenuItem onSelect={onBaixar}>Baixar</DropdownMenuItem>
        )}
        {modo === 'explorar' && !item.fixa && (
          <>
            <DropdownMenuItem onSelect={onRenomear}>Renomear</DropdownMenuItem>
            <DropdownMenuItem onSelect={onMover}>Mover</DropdownMenuItem>
            <DropdownMenuItem onSelect={onExcluir} className="text-[var(--destructive)]">Excluir</DropdownMenuItem>
          </>
        )}
        {modo === 'lixeira' && (
          <>
            <DropdownMenuItem onSelect={onRestaurar}>Restaurar</DropdownMenuItem>
            <DropdownMenuItem onSelect={onApagar} className="text-[var(--destructive)]">Excluir agora</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
