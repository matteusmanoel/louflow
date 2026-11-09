import 'server-only';
import type { Tx } from '@/lib/db';
import { novoId } from '@/lib/crypto';
import { env } from '@/lib/env';
import { ErroDominio } from '@/lib/errors';
import { chaveDaUrl, chaveDoDono, type GrupoArquivo } from '@/lib/armazenamento-chave';
import type { ItemArquivo } from './schema';

const MENSAGEM_SEM_ARMAZENAMENTO = 'O armazenamento de arquivos não está configurado. Use um link externo.';

export function urlsDoDono(arquivos: readonly ItemArquivo[], grupo: GrupoArquivo, donoId: string) {
  if (arquivos.length === 0) return;
  const cfg = env.armazenamento;
  if (!cfg) throw new ErroDominio(MENSAGEM_SEM_ARMAZENAMENTO);
  for (const arquivo of arquivos) {
    const chave = chaveDaUrl(arquivo.url, cfg.bucket, cfg.regiao);
    if (!chave || !chaveDoDono(chave, grupo, donoId)) {
      throw new ErroDominio(
        grupo === 'demandas' ? 'O arquivo não pertence a esta Demanda.' : 'O arquivo não pertence a este Corte.',
      );
    }
  }
}

export async function gravarArquivosDemanda(
  tx: Tx,
  entrada: { demandaId: string; entregaId?: string | null; usuarioId: string; arquivos: readonly ItemArquivo[] },
) {
  urlsDoDono(entrada.arquivos, 'demandas', entrada.demandaId);
  for (const arquivo of entrada.arquivos) {
    await tx`
      INSERT INTO demand_files (id, demand_id, delivery_id, url, file_name, content_type, byte_size, created_by)
      VALUES (
        ${novoId('AR')},
        ${entrada.demandaId},
        ${entrada.entregaId ?? null},
        ${arquivo.url},
        ${arquivo.nome},
        ${arquivo.tipo},
        ${arquivo.tamanho},
        ${entrada.usuarioId}
      )`;
  }
}
