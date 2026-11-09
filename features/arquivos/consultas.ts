import 'server-only';
import { db } from '@/lib/db';

export type ArquivoGuardado = {
  id: string;
  demandaId: string;
  entregaId: string | null;
  nome: string;
  url: string;
};

export async function listarArquivosDemanda(demandaId: string): Promise<ArquivoGuardado[]> {
  const linhas = await db()<
    { id: string; demand_id: string; delivery_id: string | null; file_name: string; url: string }[]
  >`
    SELECT id, demand_id, delivery_id, file_name, url
    FROM demand_files
    WHERE demand_id = ${demandaId}
    ORDER BY created_at, id`;

  return linhas.map(mapear);
}

export async function listarArquivosEntregas(entregaIds: readonly string[]): Promise<ArquivoGuardado[]> {
  if (entregaIds.length === 0) return [];
  const linhas = await db()<
    { id: string; demand_id: string; delivery_id: string | null; file_name: string; url: string }[]
  >`
    SELECT id, demand_id, delivery_id, file_name, url
    FROM demand_files
    WHERE delivery_id = ANY(${entregaIds})
    ORDER BY created_at, id`;

  return linhas.map(mapear);
}

function mapear(linha: {
  id: string;
  demand_id: string;
  delivery_id: string | null;
  file_name: string;
  url: string;
}): ArquivoGuardado {
  return {
    id: linha.id,
    demandaId: linha.demand_id,
    entregaId: linha.delivery_id,
    nome: linha.file_name,
    url: linha.url,
  };
}
