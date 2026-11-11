import 'server-only';
import type { Tx } from '@/lib/db';
import { chaveDaUrl, chavePermitida } from '@/lib/armazenamento-chave';

/** Chaves do bucket que ainda não foram gravadas em Demanda, Drive ou Corte. */
export async function chavesOrfas(tx: Tx, urls: readonly string[], bucket: string, regiao: string): Promise<string[]> {
  const chaves: string[] = [];
  for (const url of urls) {
    const chave = chaveDaUrl(url, bucket, regiao);
    if (!chave || !chavePermitida(chave)) continue;
    const [demanda] = await tx<{ ok: number }[]>`
      SELECT 1 AS ok FROM demand_files WHERE url = ${url} LIMIT 1`;
    if (demanda) continue;
    const [drive] = await tx<{ ok: number }[]>`
      SELECT 1 AS ok FROM drive_nodes WHERE url = ${url} LIMIT 1`;
    if (drive) continue;
    const [corte] = await tx<{ ok: number }[]>`
      SELECT 1 AS ok FROM clips
      WHERE video_link = ${url} OR ${url} = ANY(video_links)
      LIMIT 1`;
    if (corte) continue;
    chaves.push(chave);
  }
  return chaves;
}
