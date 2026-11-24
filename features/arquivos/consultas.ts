import 'server-only';
import { db } from '@/lib/db';

export type ArquivoGuardado = {
  id: string;
  demandaId: string;
  entregaId: string | null;
  nome: string;
  url: string;
  mime: string | null;
  tamanho: number | null;
};

export async function listarArquivosDemanda(demandaId: string): Promise<ArquivoGuardado[]> {
  const linhas = await db()<LinhaArquivo[]>`
    SELECT id, demand_id, delivery_id, file_name, url, content_type, byte_size::float8 AS byte_size
    FROM demand_files
    WHERE demand_id = ${demandaId}
      AND deleted_at IS NULL
    ORDER BY created_at, id`;

  return linhas.map(mapear);
}

export async function listarArquivosEntregas(entregaIds: readonly string[]): Promise<ArquivoGuardado[]> {
  if (entregaIds.length === 0) return [];
  const linhas = await db()<LinhaArquivo[]>`
    SELECT id, demand_id, delivery_id, file_name, url, content_type, byte_size::float8 AS byte_size
    FROM demand_files
    WHERE delivery_id = ANY(${entregaIds})
      AND deleted_at IS NULL
    ORDER BY created_at, id`;

  return linhas.map(mapear);
}

type LinhaArquivo = {
  id: string;
  demand_id: string;
  delivery_id: string | null;
  file_name: string;
  url: string;
  content_type: string | null;
  byte_size: number | null;
};

function mapear(linha: LinhaArquivo): ArquivoGuardado {
  return {
    id: linha.id,
    demandaId: linha.demand_id,
    entregaId: linha.delivery_id,
    nome: linha.file_name,
    url: linha.url,
    mime: linha.content_type,
    tamanho: linha.byte_size == null ? null : Number(linha.byte_size),
  };
}
