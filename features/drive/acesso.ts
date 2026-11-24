import 'server-only';
import type { Db } from '@/lib/db';
import type { UsuarioSessao } from '@/lib/session';

export const MSG_SEM_ACESSO = 'Você não tem acesso a esta pasta.';
export const MSG_PASTA_FIXA = 'Esta pasta acompanha a Demanda ou o Corte e não pode ser alterada.';
export const MSG_ENTREGA = 'Este arquivo faz parte de uma Entrega. Trate isso na Demanda.';
export const MSG_NOME = 'Já existe um item com esse nome nesta pasta.';
export const MSG_CICLO = 'Não é possível mover uma pasta para dentro dela mesma.';
export const MSG_COTA = 'Não há espaço suficiente no Drive.';
export const MSG_DESTINO = 'Escolha uma pasta de destino.';
export const MSG_RESTAURAR_PAI = 'Restaure a pasta que continha este item.';
export const MSG_ARQUIVO_ALHEIO = 'O arquivo não pertence a esta pasta.';
export const MSG_JA_GRAVADO = 'Este arquivo já foi gravado.';
export const DONO_RAIZ = 'raiz';
export const PROFUNDIDADE = 40;

export function filtroDemanda(db: Db, usuario: UsuarioSessao) {
  if (usuario.permissoes.verTodasDemandas) return db`d.deleted_at IS NULL`;
  return db`d.deleted_at IS NULL AND (d.editor_id = ${usuario.id} OR d.influencer_id = ${usuario.id})`;
}

export async function demandaAberta(db: Db, usuario: UsuarioSessao, id: string) {
  const [linha] = await db<{ id: string; title: string; format: string; created_at: Date }[]>`
    SELECT d.id, d.title, d.format, d.created_at
    FROM demands d
    WHERE d.id = ${id} AND ${filtroDemanda(db, usuario)}`;
  return linha ?? null;
}

export async function corteAberto(db: Db, usuario: UsuarioSessao, id: string) {
  if (!usuario.permissoes.verAbaCortes) return null;
  const [linha] = await db<{ id: string; title: string; created_at: Date }[]>`
    SELECT id, title, created_at FROM clips WHERE id = ${id}`;
  return linha ?? null;
}

export async function usoBytes(db: Db): Promise<number> {
  const [linha] = await db<{ usado: number }[]>`
    SELECT (
      COALESCE((SELECT SUM(byte_size) FROM demand_files), 0)
      + COALESCE((SELECT SUM(byte_size) FROM drive_nodes WHERE kind = 'arquivo' AND demand_file_id IS NULL), 0)
    )::float8 AS usado`;
  return Number(linha?.usado ?? 0);
}

export async function paiVisivel(db: Db, usuario: UsuarioSessao, parentId: string | null): Promise<boolean> {
  let atual = parentId;
  const vistos = new Set<string>();
  while (atual) {
    if (vistos.has(atual) || vistos.size > PROFUNDIDADE) return false;
    vistos.add(atual);
    const [no] = await db<{ parent_id: string | null; kind: string }[]>`
      SELECT parent_id, kind FROM drive_nodes WHERE id = ${atual}`;
    if (no) {
      if (no.kind !== 'pasta') return false;
      atual = no.parent_id;
      continue;
    }
    if (await demandaAberta(db, usuario, atual)) return true;
    if (await corteAberto(db, usuario, atual)) return true;
    return false;
  }
  return true;
}

export async function nomeOcupado(
  db: Db,
  usuario: UsuarioSessao,
  parentId: string | null,
  nome: string,
  ignorar: readonly string[],
): Promise<boolean> {
  const fora = ignorar.length > 0 ? ignorar : [''];
  const [no] = await db<{ ok: number }[]>`
    SELECT 1 AS ok FROM drive_nodes
    WHERE deleted_at IS NULL
      AND parent_id IS NOT DISTINCT FROM ${parentId}
      AND lower(name) = lower(${nome})
      AND NOT (id = ANY(${fora}))
    LIMIT 1`;
  if (no) return true;

  if (parentId == null) {
    const [demanda] = await db<{ ok: number }[]>`
      SELECT 1 AS ok FROM demands d
      WHERE ${filtroDemanda(db, usuario)} AND lower(d.title) = lower(${nome})
      LIMIT 1`;
    if (demanda) return true;
    if (usuario.permissoes.verAbaCortes) {
      const [corte] = await db<{ ok: number }[]>`
        SELECT 1 AS ok FROM clips WHERE lower(title) = lower(${nome}) LIMIT 1`;
      if (corte) return true;
    }
    return false;
  }

  const [arquivo] = await db<{ ok: number }[]>`
    SELECT 1 AS ok FROM demand_files f
    WHERE f.demand_id = ${parentId}
      AND f.deleted_at IS NULL
      AND lower(f.file_name) = lower(${nome})
      AND NOT EXISTS (SELECT 1 FROM drive_nodes n WHERE n.demand_file_id = f.id)
      AND NOT (f.id = ANY(${fora}))
    LIMIT 1`;
  return Boolean(arquivo);
}
