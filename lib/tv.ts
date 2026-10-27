/**
 * [PROTEGIDO] DTO público do Painel de TV. Lista branca explícita: cada campo é copiado
 * um a um. Proibido spread de linha do banco. Nunca: e-mail, PIN, Sessão, Ficha Técnica,
 * motivo de Adiamento, link de material, ganhador de Sorteio.
 * Os dados brutos vêm de features/tv/consultas.ts (S1-09); campo novo exige mudar este arquivo.
 */

export type ResumoMesTv = {
  criadas: number;
  concluidas: number;
  emAndamento: number;
  atrasadas: number;
  aguardandoAprovacao: number;
  semEditor: number;
};

export type DemandaTv = {
  id: string;
  titulo: string;
  formato: string;
  editor: string | null;
  influencer: string | null;
  status: string;
  prioridade: string;
  prazo: string | null;
  diasParaPrazo: number | null;
};

export type AlertaItemTv = {
  titulo: string;
  editor: string | null;
  influencer: string | null;
  prazo: string | null;
  diasParaPrazo: number;
  atrasada: boolean;
};

export type AlertasTv = {
  itens: AlertaItemTv[];
  totalAtrasadas: number;
  totalProximas: number;
};

export type AprovacaoTv = {
  demandaId: string;
  titulo: string;
  editor: string | null;
  influencer: string | null;
  versao: number;
  desde: string;
  horasEspera: number;
};

export type InfluencerTv = { nome: string; aprovar: number; agendar: number };

export type EntregaTv = {
  titulo: string;
  editor: string | null;
  influencer: string | null;
  versao: number;
  situacao: string;
  data: string;
};

export type AgendamentoTv = {
  titulo: string;
  marca: string;
  plataforma: string;
  quando: string;
  situacao: string;
  influencer: string | null;
  avulso: boolean;
  tipoConteudo: string | null;
};

export type CaptacaoTv = {
  inicio: string;
  fim: string;
  videomaker: string;
  cliente: string | null;
  assunto: string | null;
  local: string | null;
  influencer: string | null;
};

export type CorteTv = {
  titulo: string;
  linhaEditorial: string;
  programa: string;
  dataPostagem: string;
  situacao: string;
};

export type RankingTv = {
  editor: string;
  nota: number;
  quantidade: number;
  staff: boolean;
  percentualAprovacao: number;
  tempoMedioHoras: number;
  demandasNota: number;
};

export type FormatoProdutividadeTv = { formato: string; quantidade: number };

export type ProdutividadeTv = {
  totalConcluidas: number;
  tempoMedioHoras: number;
  percentualNoPrazo: number;
  porFormato: FormatoProdutividadeTv[];
};

export type CargaEditorTv = {
  editor: string;
  abertas: number;
  atrasadas: number;
  disponibilidade: string;
};

export type PayloadTv = {
  geradoEm: string;
  resumoMes: ResumoMesTv;
  demandasPendentes: DemandaTv[];
  alertas: AlertasTv;
  aprovacoes: AprovacaoTv[];
  influencers: InfluencerTv[];
  entregas: EntregaTv[];
  agenda: AgendamentoTv[];
  captacoes: CaptacaoTv[];
  cortes: CorteTv[];
  ranking: RankingTv[];
  produtividade: ProdutividadeTv | null;
  cargaEditores: CargaEditorTv[];
};

type Linha = Record<string, unknown>;

const txt = (v: unknown) => (v == null || v === '' ? null : String(v));
const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const inteiro = (v: unknown) => Math.trunc(num(v));
const inteiroNulo = (v: unknown) => (v == null || v === '' ? null : Math.trunc(num(v)));
const flag = (v: unknown) => v === true;

function instante(v: unknown): string {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  if (v == null || v === '') return '';
  const data = new Date(String(v));
  return Number.isNaN(data.getTime()) ? '' : data.toISOString();
}

/** Coluna `date` chega como meia-noite UTC. O dia civil é o componente UTC, não o fuso do viewer. */
function calendario(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const mes = String(v.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(v.getUTCDate()).padStart(2, '0');
    return `${v.getUTCFullYear()}-${mes}-${dia}`;
  }
  const encontrado = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return encontrado?.[1] ?? null;
}

function lista(v: unknown): Linha[] {
  return Array.isArray(v) ? v.filter((item): item is Linha => item != null && typeof item === 'object') : [];
}

export function paraDtoTv(bruto: {
  resumoMes: Linha;
  demandasPendentes: Linha[];
  alertas: { itens: Linha[]; totalAtrasadas?: unknown; totalProximas?: unknown };
  aprovacoes: Linha[];
  influencers: Linha[];
  entregas: Linha[];
  agenda: Linha[];
  captacoes: Linha[];
  cortes: Linha[];
  ranking: Linha[];
  produtividade: Linha | null;
  cargaEditores: Linha[];
}, agora = new Date()): PayloadTv {
  const produtividade = bruto.produtividade;
  return {
    geradoEm: agora.toISOString(),
    resumoMes: {
      criadas: inteiro(bruto.resumoMes.criadas),
      concluidas: inteiro(bruto.resumoMes.concluidas),
      emAndamento: inteiro(bruto.resumoMes.emAndamento),
      atrasadas: inteiro(bruto.resumoMes.atrasadas),
      aguardandoAprovacao: inteiro(bruto.resumoMes.aguardandoAprovacao),
      semEditor: inteiro(bruto.resumoMes.semEditor),
    },
    demandasPendentes: bruto.demandasPendentes.map((d) => ({
      id: String(d.id),
      titulo: String(d.titulo),
      formato: String(d.formato),
      editor: txt(d.editor),
      influencer: txt(d.influencer),
      status: String(d.status),
      prioridade: String(d.prioridade),
      prazo: calendario(d.prazo),
      diasParaPrazo: inteiroNulo(d.diasParaPrazo),
    })),
    alertas: {
      totalAtrasadas: inteiro(bruto.alertas.totalAtrasadas),
      totalProximas: inteiro(bruto.alertas.totalProximas),
      itens: lista(bruto.alertas.itens).map((item) => ({
        titulo: String(item.titulo),
        editor: txt(item.editor),
        influencer: txt(item.influencer),
        prazo: calendario(item.prazo),
        diasParaPrazo: inteiro(item.diasParaPrazo),
        atrasada: flag(item.atrasada),
      })),
    },
    aprovacoes: bruto.aprovacoes.map((a) => ({
      demandaId: String(a.demandaId),
      titulo: String(a.titulo),
      editor: txt(a.editor),
      influencer: txt(a.influencer),
      versao: inteiro(a.versao),
      desde: instante(a.desde),
      horasEspera: Math.max(0, inteiro(a.horasEspera)),
    })),
    influencers: bruto.influencers.map((i) => ({
      nome: String(i.nome),
      aprovar: inteiro(i.aprovar),
      agendar: inteiro(i.agendar),
    })),
    entregas: bruto.entregas.map((e) => ({
      titulo: String(e.titulo),
      editor: txt(e.editor),
      influencer: txt(e.influencer),
      versao: inteiro(e.versao),
      situacao: String(e.situacao),
      data: instante(e.data),
    })),
    agenda: bruto.agenda.map((a) => ({
      titulo: String(a.titulo),
      marca: String(a.marca),
      plataforma: String(a.plataforma),
      quando: instante(a.quando),
      situacao: String(a.situacao),
      influencer: txt(a.influencer),
      avulso: flag(a.avulso),
      tipoConteudo: txt(a.tipoConteudo),
    })),
    captacoes: bruto.captacoes.map((c) => ({
      inicio: instante(c.inicio),
      fim: instante(c.fim),
      videomaker: String(c.videomaker),
      cliente: txt(c.cliente),
      assunto: txt(c.assunto),
      local: txt(c.local),
      influencer: txt(c.influencer),
    })),
    cortes: bruto.cortes.map((c) => ({
      titulo: String(c.titulo),
      linhaEditorial: String(c.linhaEditorial),
      programa: String(c.programa),
      dataPostagem: calendario(c.dataPostagem) ?? '',
      situacao: String(c.situacao),
    })),
    ranking: bruto.ranking.map((r) => ({
      editor: String(r.editor),
      nota: num(r.nota),
      quantidade: inteiro(r.quantidade),
      staff: flag(r.staff),
      percentualAprovacao: inteiro(r.percentualAprovacao),
      tempoMedioHoras: num(r.tempoMedioHoras),
      demandasNota: inteiro(r.demandasNota),
    })),
    produtividade: produtividade
      ? {
          totalConcluidas: inteiro(produtividade.totalConcluidas),
          tempoMedioHoras: num(produtividade.tempoMedioHoras),
          percentualNoPrazo: inteiro(produtividade.percentualNoPrazo),
          porFormato: lista(produtividade.porFormato).slice(0, 6).map((f) => ({
            formato: String(f.formato),
            quantidade: inteiro(f.quantidade),
          })),
        }
      : null,
    cargaEditores: bruto.cargaEditores.map((c) => ({
      editor: String(c.editor),
      abertas: inteiro(c.abertas),
      atrasadas: inteiro(c.atrasadas),
      disponibilidade: String(c.disponibilidade),
    })),
  };
}
