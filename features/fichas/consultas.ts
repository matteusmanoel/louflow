import { db, type Db } from '@/lib/db';

export type FichaTecnica = {
  demandaId: string;
  formato: string | null;
  duracaoSegundos: number | null;
  plataformas: string[];
  briefing: string | null;
  observacoesTecnicas: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type LinhaFicha = {
  demand_id: string;
  formato: string | null;
  duracao_segundos: number | null;
  plataformas: string[] | null;
  briefing: string | null;
  observacoes_tecnicas: string | null;
  ts_created_at: Date | null;
  ts_updated_at: Date | null;
};

function mapear(linha: LinhaFicha): FichaTecnica {
  return {
    demandaId: linha.demand_id,
    formato: linha.formato,
    duracaoSegundos: linha.duracao_segundos,
    plataformas: linha.plataformas ?? [],
    briefing: linha.briefing,
    observacoesTecnicas: linha.observacoes_tecnicas,
    createdAt: linha.ts_created_at,
    updatedAt: linha.ts_updated_at,
  };
}

/** Retorna a ficha técnica de uma Demanda, ou null se não houver. */
export async function obterFichaTecnica(sql: Db, demandaId: string): Promise<FichaTecnica | null> {
  const [linha] = await sql<LinhaFicha[]>`
    SELECT
      demand_id,
      formato,
      duracao_segundos,
      plataformas,
      briefing,
      observacoes_tecnicas,
      ts_created_at,
      ts_updated_at
    FROM technical_sheets
    WHERE demand_id = ${demandaId}
  `;
  if (!linha) return null;
  return mapear(linha);
}

/** Retorna a ficha técnica (usa db() padrão — para páginas). */
export async function obterFichaTecnicaDb(demandaId: string): Promise<FichaTecnica | null> {
  return obterFichaTecnica(db(), demandaId);
}
