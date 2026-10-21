import type { Db } from '@/lib/db';
import type { paraDtoTv } from '@/lib/tv';

export type DadosBrutosTv = Parameters<typeof paraDtoTv>[0];

/** S1-09 (#11564): consultas do Painel de TV. Selecione só as colunas necessárias. */
export async function carregarDadosTv(sql: Db): Promise<DadosBrutosTv> {
  void sql;
  return {
    resumoMes: { criadas: 0, concluidas: 0, emAndamento: 0, atrasadas: 0 },
    demandasPendentes: [],
    aprovacoes: [],
    agenda: [],
    captacoes: [],
    cortes: [],
  };
}
