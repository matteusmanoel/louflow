/**
 * Nota, produtividade e carga do Painel de TV.
 * Fórmula de calcularRankingPeriodo_ (demandas-edits/Relatorios.js):
 * volume 40 + aprovação direta 20 + agilidade 10, normalizados para 100.
 * Quem disputa é Editor ativo. Staff (designação notaInformativaRanking) não disputa.
 * O mês já vem filtrado por quem chama. Tempo só de editing_cycles.active_ms.
 */

export const LINHAS_POR_SLIDE = 8;
export const ALERTA_PRAZO_DIAS = 2;
export const ENTREGAS_DIAS = 7;

export type DemandaRanking = {
  editor: string;
  formato: string;
  ajustes: number;
  tempoAtivoMs: number;
  staff: boolean;
  disputa: boolean;
};

export type CaptacaoRanking = {
  editor: string;
  staff: boolean;
  disputa: boolean;
};

export type ItemRanking = {
  editor: string;
  nota: number;
  quantidade: number;
  staff: boolean;
  percentualAprovacao: number;
  tempoMedioHoras: number;
  demandasNota: number;
};

export type DemandaProdutividade = {
  formato: string;
  prazo: Date | string | null;
  pausaMs: number;
  ultimaEntregaEm: Date | null;
  tempoAtivoMs: number;
};

export type Produtividade = {
  totalConcluidas: number;
  tempoMedioHoras: number;
  percentualNoPrazo: number;
  porFormato: { formato: string; quantidade: number }[];
};

export type CargaBruta = {
  editor: string;
  abertas: number;
  atrasadas: number;
  cortesEmAndamento: number;
};

export type CargaEditor = {
  editor: string;
  abertas: number;
  atrasadas: number;
  disponibilidade: string;
};

type Acumulo = {
  editor: string;
  quantidade: number;
  quantidadeNota: number;
  demandasNota: number;
  aprovadasDireto: number;
  somaHoras: number;
  comTempo: number;
  staff: boolean;
  disputa: boolean;
};

function normalizar(valor: string) {
  return valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function ehCriativo(formato: string) {
  const texto = normalizar(formato);
  return texto === 'criativo' || texto === 'criativos';
}

/** Dia de calendário de uma coluna `date` (meia-noite UTC) ou de um 'YYYY-MM-DD'. */
export function diaCalendario(valor: Date | string | null | undefined): string | null {
  if (valor == null || valor === '') return null;
  if (typeof valor === 'string') {
    const encontrado = valor.match(/^(\d{4}-\d{2}-\d{2})/);
    return encontrado?.[1] ?? null;
  }
  if (Number.isNaN(valor.getTime())) return null;
  const mes = String(valor.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(valor.getUTCDate()).padStart(2, '0');
  return `${valor.getUTCFullYear()}-${mes}-${dia}`;
}

/** Fim do dia do prazo em BRT (UTC−3, sem horário de verão), mais as pausas já encerradas. */
export function instanteFimDoPrazo(dia: string, pausaMs: number): number {
  const [ano, mes, diaMes] = dia.split('-').map(Number);
  const inicioBrt = Date.UTC(ano!, (mes ?? 1) - 1, diaMes, 3, 0, 0, 0);
  return inicioBrt + 24 * 60 * 60 * 1000 - 1 + Math.max(0, pausaMs);
}

export function dentroDoPrazo(
  entrega: Date | null,
  prazo: Date | string | null,
  pausaMs: number,
): boolean | null {
  const dia = diaCalendario(prazo);
  if (!dia || !entrega || Number.isNaN(entrega.getTime())) return null;
  return entrega.getTime() <= instanteFimDoPrazo(dia, pausaMs);
}

/** Diferença de dias de calendário em BRT, sem somar pausa (o slide lê o prazo combinado). */
export function diasAtePrazo(prazo: Date | string | null, agora = new Date()): number | null {
  const dia = diaCalendario(prazo);
  if (!dia) return null;
  const hoje = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
  const [anoPrazo, mesPrazo, diaPrazo] = dia.split('-').map(Number);
  const [anoHoje, mesHoje, diaHoje] = hoje.split('-').map(Number);
  const msPrazo = Date.UTC(anoPrazo!, (mesPrazo ?? 1) - 1, diaPrazo);
  const msHoje = Date.UTC(anoHoje!, (mesHoje ?? 1) - 1, diaHoje);
  return Math.round((msPrazo - msHoje) / 86_400_000);
}

function umaCasa(valor: number) {
  return Math.round(valor * 10) / 10;
}

function vazio(): Omit<Acumulo, 'editor' | 'staff' | 'disputa'> {
  return {
    quantidade: 0,
    quantidadeNota: 0,
    demandasNota: 0,
    aprovadasDireto: 0,
    somaHoras: 0,
    comTempo: 0,
  };
}

export function calcularRanking(demandas: DemandaRanking[], captacoes: CaptacaoRanking[]): ItemRanking[] {
  const porEditor = new Map<string, Acumulo>();

  function obter(editor: string, staff: boolean, disputa: boolean) {
    const atual = porEditor.get(editor);
    if (atual) {
      atual.staff = atual.staff || staff;
      atual.disputa = atual.disputa || disputa;
      return atual;
    }
    const criado: Acumulo = { editor, staff, disputa, ...vazio() };
    porEditor.set(editor, criado);
    return criado;
  }

  for (const demanda of demandas) {
    const editor = demanda.editor.trim();
    if (!editor || (!demanda.staff && !demanda.disputa)) continue;
    const item = obter(editor, demanda.staff, demanda.disputa);
    item.quantidade += 1;
    if (ehCriativo(demanda.formato)) continue;
    item.quantidadeNota += 1;
    item.demandasNota += 1;
    if (demanda.ajustes === 0) item.aprovadasDireto += 1;
    if (demanda.tempoAtivoMs > 0) {
      item.somaHoras += demanda.tempoAtivoMs / 3_600_000;
      item.comTempo += 1;
    }
  }

  for (const captacao of captacoes) {
    const editor = captacao.editor.trim();
    if (!editor || (!captacao.staff && !captacao.disputa)) continue;
    const item = obter(editor, captacao.staff, captacao.disputa);
    item.quantidade += 1;
    item.quantidadeNota += 1;
  }

  const itens = [...porEditor.values()].filter((item) => {
    if (item.staff) item.disputa = false;
    return item.staff || item.disputa;
  });
  if (!itens.length) return [];

  const medidos = itens.map((item) => ({
    ...item,
    tempoMedioHoras: item.comTempo ? umaCasa(item.somaHoras / item.comTempo) : 0,
  }));

  const referencia = medidos.some((item) => !item.staff)
    ? medidos.filter((item) => !item.staff)
    : medidos;
  const maiorVolumeNota = Math.max(...referencia.map((item) => item.quantidadeNota));
  const tempos = referencia.map((item) => item.tempoMedioHoras).filter((horas) => horas > 0);
  const menorTempo = tempos.length ? Math.min(...tempos) : 0;

  const notaDe = (item: (typeof medidos)[number]) => {
    const tempo = item.tempoMedioHoras;
    const pontosVolume = maiorVolumeNota ? Math.min(1, item.quantidadeNota / maiorVolumeNota) * 40 : 0;
    const percentual = item.demandasNota
      ? Math.round((item.aprovadasDireto / item.demandasNota) * 100)
      : 100;
    const pontosAprovacao = item.quantidadeNota ? (percentual / 100) * 20 : 0;
    const pontosAgilidade = tempo && menorTempo ? Math.min(1, menorTempo / tempo) * 10 : 0;
    const nota = item.quantidadeNota
      ? Math.round(((pontosVolume + pontosAprovacao + pontosAgilidade) / 70) * 1000) / 10
      : 0;
    return { nota, percentual, tempo };
  };

  const comNota = medidos.map((item) => {
    const { nota, percentual, tempo } = notaDe(item);
    return {
      editor: item.editor,
      nota,
      quantidade: item.quantidade,
      staff: item.staff,
      percentualAprovacao: percentual,
      tempoMedioHoras: tempo,
      demandasNota: item.demandasNota,
      amostraValida: item.quantidade >= 2,
    };
  });

  const disputam = comNota
    .filter((item) => !item.staff)
    .sort((a, b) =>
      Number(b.amostraValida) - Number(a.amostraValida)
      || b.nota - a.nota
      || b.quantidade - a.quantidade
      || a.editor.localeCompare(b.editor, 'pt-BR'));

  const staff = comNota
    .filter((item) => item.staff)
    .sort((a, b) => a.editor.localeCompare(b.editor, 'pt-BR'));

  return disputam.slice(0, LINHAS_POR_SLIDE - 1).concat(staff).map((item) => ({
    editor: item.editor,
    nota: item.nota,
    quantidade: item.quantidade,
    staff: item.staff,
    percentualAprovacao: item.percentualAprovacao,
    tempoMedioHoras: item.tempoMedioHoras,
    demandasNota: item.demandasNota,
  }));
}

export function calcularProdutividade(
  demandas: DemandaProdutividade[],
  captacoesConcluidas: number,
): Produtividade | null {
  const totalConcluidas = demandas.length + captacoesConcluidas;
  if (totalConcluidas === 0) return null;

  let somaHoras = 0;
  let comTempo = 0;
  let comPrazo = 0;
  let noPrazo = 0;
  const porFormato = new Map<string, number>();

  for (const demanda of demandas) {
    if (demanda.tempoAtivoMs > 0) {
      somaHoras += demanda.tempoAtivoMs / 3_600_000;
      comTempo += 1;
    }
    const entregue = dentroDoPrazo(demanda.ultimaEntregaEm, demanda.prazo, demanda.pausaMs);
    if (entregue !== null) {
      comPrazo += 1;
      if (entregue) noPrazo += 1;
    }
    const formato = demanda.formato.trim() || 'Sem formato';
    porFormato.set(formato, (porFormato.get(formato) ?? 0) + 1);
  }

  if (captacoesConcluidas > 0) {
    porFormato.set('Captação', (porFormato.get('Captação') ?? 0) + captacoesConcluidas);
  }

  return {
    totalConcluidas,
    tempoMedioHoras: comTempo ? umaCasa(somaHoras / comTempo) : 0,
    percentualNoPrazo: comPrazo ? Math.round((noPrazo / comPrazo) * 100) : 0,
    porFormato: [...porFormato.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .slice(0, 6)
      .map(([formato, quantidade]) => ({ formato, quantidade })),
  };
}

export function disponibilidadeCarga(item: Pick<CargaBruta, 'abertas' | 'cortesEmAndamento'>) {
  if (item.cortesEmAndamento > 0) return 'Ocupada com corte';
  if (item.abertas === 0) return 'Disponível';
  if (item.abertas <= 3) return 'Boa disponibilidade';
  if (item.abertas <= 6) return 'Carga moderada';
  return 'Carga alta';
}

/** Até 8 editores, os de maior carga. Lista vazia some do carrossel. */
export function selecionarCarga(itens: CargaBruta[]): CargaEditor[] {
  return itens
    .filter((item) => item.editor.trim())
    .sort((a, b) => b.abertas - a.abertas || a.editor.localeCompare(b.editor, 'pt-BR'))
    .slice(0, LINHAS_POR_SLIDE)
    .map((item) => ({
      editor: item.editor,
      abertas: item.abertas,
      atrasadas: item.atrasadas,
      disponibilidade: disponibilidadeCarga(item),
    }));
}