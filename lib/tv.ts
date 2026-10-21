/**
 * [PROTEGIDO] DTO público do Painel de TV. Lista branca explícita: cada campo é copiado
 * um a um. Proibido spread de linha do banco. Nunca: e-mail, PIN, Sessão, Ficha Técnica,
 * motivo de Adiamento, link de material, ganhador de Sorteio.
 * Os dados brutos vêm de features/tv/consultas.ts (S1-09); campo novo exige mudar este arquivo.
 */

export type ResumoMesTv = { criadas: number; concluidas: number; emAndamento: number; atrasadas: number };
export type DemandaTv = { id: string; titulo: string; formato: string; editor: string | null; influencer: string | null; status: string; prioridade: string; prazo: string | null };
export type AprovacaoTv = { demandaId: string; titulo: string; editor: string | null; influencer: string | null; versao: number; desde: string };
export type AgendamentoTv = { titulo: string; marca: string; plataforma: string; quando: string; situacao: string };
export type CaptacaoTv = { inicio: string; fim: string; videomaker: string; cliente: string | null; assunto: string | null; local: string | null };
export type CorteTv = { titulo: string; linhaEditorial: string; programa: string; dataPostagem: string; situacao: string };

export type PayloadTv = {
  geradoEm: string;
  resumoMes: ResumoMesTv;
  demandasPendentes: DemandaTv[];
  aprovacoes: AprovacaoTv[];
  agenda: AgendamentoTv[];
  captacoes: CaptacaoTv[];
  cortes: CorteTv[];
};

type Bruto<T> = { [K in keyof T]: unknown } & Record<string, unknown>;

const txt = (v: unknown) => (v == null ? null : String(v));
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0) || 0);
const data = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));

export function paraDtoTv(bruto: {
  resumoMes: Bruto<ResumoMesTv>;
  demandasPendentes: Bruto<DemandaTv>[];
  aprovacoes: Bruto<AprovacaoTv>[];
  agenda: Bruto<AgendamentoTv>[];
  captacoes: Bruto<CaptacaoTv>[];
  cortes: Bruto<CorteTv>[];
}, agora = new Date()): PayloadTv {
  return {
    geradoEm: agora.toISOString(),
    resumoMes: {
      criadas: num(bruto.resumoMes.criadas),
      concluidas: num(bruto.resumoMes.concluidas),
      emAndamento: num(bruto.resumoMes.emAndamento),
      atrasadas: num(bruto.resumoMes.atrasadas),
    },
    demandasPendentes: bruto.demandasPendentes.map((d) => ({
      id: String(d.id), titulo: String(d.titulo), formato: String(d.formato), editor: txt(d.editor),
      influencer: txt(d.influencer), status: String(d.status), prioridade: String(d.prioridade), prazo: data(d.prazo),
    })),
    aprovacoes: bruto.aprovacoes.map((a) => ({
      demandaId: String(a.demandaId), titulo: String(a.titulo), editor: txt(a.editor),
      influencer: txt(a.influencer), versao: num(a.versao), desde: data(a.desde) ?? '',
    })),
    agenda: bruto.agenda.map((a) => ({
      titulo: String(a.titulo), marca: String(a.marca), plataforma: String(a.plataforma),
      quando: data(a.quando) ?? '', situacao: String(a.situacao),
    })),
    captacoes: bruto.captacoes.map((c) => ({
      inicio: data(c.inicio) ?? '', fim: data(c.fim) ?? '', videomaker: String(c.videomaker),
      cliente: txt(c.cliente), assunto: txt(c.assunto), local: txt(c.local),
    })),
    cortes: bruto.cortes.map((c) => ({
      titulo: String(c.titulo), linhaEditorial: String(c.linhaEditorial), programa: String(c.programa),
      dataPostagem: data(c.dataPostagem) ?? '', situacao: String(c.situacao),
    })),
  };
}
