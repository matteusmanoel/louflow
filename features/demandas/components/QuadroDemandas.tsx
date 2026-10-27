'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { Search, X, SlidersHorizontal, Plus, FileText } from 'lucide-react';
import type { Demanda, FiltrosListarDemandas, ResumoEditor } from '../consultas';
import { CardDemanda } from './CardDemanda';
import { QuadroKanban } from './QuadroKanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { EstadoVazio } from '@/components/ui/estado-vazio';

const INTERVALO_POLLING_MS = 30_000;
const CONSULTA_ESTREITA = '(max-width: 649px)';

function inscreverLargura(ouvir: () => void) {
  const mq = window.matchMedia(CONSULTA_ESTREITA);
  mq.addEventListener('change', ouvir);
  return () => mq.removeEventListener('change', ouvir);
}

function larguraEstreita() {
  return window.matchMedia(CONSULTA_ESTREITA).matches;
}

type Props = {
  demandasIniciais: Demanda[];
  resumoEditores: ResumoEditor[];
  buscarDemandas: (filtros: FiltrosListarDemandas) => Promise<Demanda[]>;
  revisaoInicial: number;
  podeCriar: boolean;
  visao: 'lista' | 'quadro';
  podeMover: boolean;
  podeEntregar: boolean;
};

export function QuadroDemandas({
  demandasIniciais,
  resumoEditores,
  buscarDemandas,
  revisaoInicial,
  podeCriar,
  visao,
  podeMover,
  podeEntregar,
}: Props) {
  const [demandas, setDemandas] = useState<Demanda[]>(demandasIniciais);
  const [filtros, setFiltros] = useState<FiltrosListarDemandas>({});
  const [busca, setBusca] = useState('');
  const [editorFiltro, setEditorFiltro] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const estreito = useSyncExternalStore(inscreverLargura, larguraEstreita, () => false);
  const revisaoRef = useRef(revisaoInicial);
  const [, startTransition] = useTransition();
  const assinaturaServidor = demandasIniciais.map((d) => `${d.id}:${d.status}:${d.title}`).join('|');
  const [assinaturaVista, setAssinaturaVista] = useState(assinaturaServidor);
  const temFiltrosAtivos =
    Boolean(busca || editorFiltro || periodoInicio || periodoFim);
  if (assinaturaServidor !== assinaturaVista && !temFiltrosAtivos) {
    setAssinaturaVista(assinaturaServidor);
    setDemandas(demandasIniciais);
  }

  const recarregar = useCallback(
    async (novosFiltros: FiltrosListarDemandas) => {
      startTransition(async () => {
        const lista = await buscarDemandas(novosFiltros);
        setDemandas(lista);
      });
    },
    [buscarDemandas],
  );

  // Polling: verifica revisão a cada 30s
  useEffect(() => {
    const controller = new AbortController();
    const intervalo = setInterval(async () => {
      try {
        const resp = await fetch(`/api/sync?desde=${revisaoRef.current}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!resp.ok) return;
        const { alterou, revisao } = (await resp.json()) as { alterou: boolean; revisao: number };
        if (alterou) {
          revisaoRef.current = revisao;
          await recarregar(filtros);
        }
      } catch {
        // falha silenciosa: rede ou abort
      }
    }, INTERVALO_POLLING_MS);

    return () => {
      clearInterval(intervalo);
      controller.abort();
    };
  }, [filtros, recarregar]);

  function aplicarFiltros() {
    const novosFiltros: FiltrosListarDemandas = {
      busca: busca || undefined,
      editor_id: editorFiltro || undefined,
      periodo:
        periodoInicio && periodoFim
          ? { inicio: periodoInicio, fim: periodoFim }
          : undefined,
    };
    setFiltros(novosFiltros);
    void recarregar(novosFiltros);
  }

  function limparFiltros() {
    setBusca('');
    setEditorFiltro('');
    setPeriodoInicio('');
    setPeriodoFim('');
    setFiltros({});
    void recarregar({});
  }

  function camposAvancados(sufixo: string) {
    return (
      <>
        {resumoEditores.length > 0 && (
          <div className="space-y-1 flex-1 min-w-[150px]">
            <Label htmlFor={`filtro-editor${sufixo}`}>Editor</Label>
            <Select
              value={editorFiltro || 'todos'}
              onValueChange={(valor) => setEditorFiltro(valor === 'todos' ? '' : valor)}
            >
              <SelectTrigger id={`filtro-editor${sufixo}`}>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {resumoEditores.map((e) => (
                  <SelectItem key={e.editor_id} value={e.editor_id}>
                    {e.editor_label ?? e.editor_nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor={`filtro-de${sufixo}`}>De</Label>
          <Input
            id={`filtro-de${sufixo}`}
            type="date"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`filtro-ate${sufixo}`}>Até</Label>
          <Input
            id={`filtro-ate${sufixo}`}
            type="date"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            className="w-full"
          />
        </div>
      </>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex gap-2" role="group" aria-label="Visão">
        <Button asChild variant={visao === 'lista' ? 'default' : 'outline'} size="sm">
          <Link href="/demandas">Lista</Link>
        </Button>
        <Button asChild variant={visao === 'quadro' ? 'default' : 'outline'} size="sm">
          <Link href="/demandas?visao=quadro">Quadro</Link>
        </Button>
      </div>
      {/* Barra de filtros */}
      <div className="rounded-[var(--raio-painel)] border border-[var(--borda-app)] bg-[var(--superficie)] p-4 flex flex-wrap gap-3 items-end">
        <SlidersHorizontal className="h-4 w-4 text-[var(--texto-suave)] self-center mt-4" aria-hidden />

        <div className="space-y-1 flex-1 min-w-[180px]">
          <Label htmlFor="filtro-busca">Buscar</Label>
          <Input
            id="filtro-busca"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
            placeholder="Título…"
          />
        </div>

        {!estreito && camposAvancados('')}

        {estreito && (
          <Sheet open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="flex flex-col gap-4">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              {camposAvancados('-painel')}
              <Button
                type="button"
                onClick={() => {
                  aplicarFiltros();
                  setFiltrosAbertos(false);
                }}
              >
                Aplicar
              </Button>
            </SheetContent>
          </Sheet>
        )}

        <div className="flex gap-2 self-end">
          <Button type="button" onClick={aplicarFiltros} size="sm">
            <Search className="h-3.5 w-3.5" aria-hidden />
            Filtrar
          </Button>
          <Button type="button" variant="outline" onClick={limparFiltros} size="sm" disabled={!temFiltrosAtivos}>
            <X className="h-3.5 w-3.5" aria-hidden />
            Limpar
          </Button>
        </div>
      </div>

      {/* Resumo por Editor */}
      {resumoEditores.length > 0 && (
        <div className="flex flex-wrap gap-2.5 rounded-[var(--raio-card)] border border-[var(--tabela-cabecalho-borda)] bg-[var(--tabela-cabecalho-fundo)] p-3">
          {resumoEditores.map((e) => (
            <div
              key={e.editor_id}
              className="rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] px-3 py-2 text-xs"
            >
              <div className="font-semibold text-[var(--texto-forte)]">
                {e.editor_label ?? e.editor_nome}
              </div>
              <div className="text-[var(--texto-suave)] mt-0.5">
                <span className="fonte-numero">{e.total}</span> total ·{' '}
                <span className="fonte-numero">{e.em_execucao}</span> em exec. ·{' '}
                <span className="fonte-numero">{e.concluidas}</span> conc.
                {e.atrasadas > 0 && (
                  <span className="text-[var(--alerta-atrasada)] font-semibold">
                    {' '}· <span className="fonte-numero">{e.atrasadas}</span> atras.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {visao === 'quadro' ? (
        demandas.length === 0 ? (
          <EstadoVazio
            icone={FileText}
            titulo="Nenhuma demanda encontrada"
            descricao={temFiltrosAtivos ? 'Tente remover os filtros.' : undefined}
          />
        ) : (
          <QuadroKanban
            demandas={demandas}
            podeMover={podeMover}
            podeEntregar={podeEntregar}
            aoAtualizar={() => void recarregar(filtros)}
          />
        )
      ) : (
      <div className="flex flex-col gap-2.5">
        {demandas.length === 0 ? (
          <EstadoVazio
            icone={FileText}
            titulo="Nenhuma demanda encontrada"
            descricao={temFiltrosAtivos ? 'Tente remover os filtros.' : undefined}
            acao={
              podeCriar ? (
                <Button asChild size="sm">
                  <Link href="/demandas/nova">
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Criar demanda
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          demandas.map((d) => <CardDemanda key={d.id} demanda={d} />)
        )}
      </div>
      )}
    </div>
  );
}
