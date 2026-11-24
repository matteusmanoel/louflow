import 'server-only';
import type { Db } from '@/lib/db';
import { novoId } from '@/lib/crypto';
import { env } from '@/lib/env';
import { ErroDominio } from '@/lib/errors';
import { prepararEnvio } from '@/lib/armazenamento';
import { chaveDaUrl, chaveDoDono, type GrupoArquivo } from '@/lib/armazenamento-chave';
import type { UsuarioSessao } from '@/lib/session';
import type { ItemArquivo } from '@/features/arquivos/schema';
import {
  DONO_RAIZ,
  MSG_ARQUIVO_ALHEIO,
  MSG_CICLO,
  MSG_COTA,
  MSG_DESTINO,
  MSG_ENTREGA,
  MSG_JA_GRAVADO,
  MSG_NOME,
  MSG_PASTA_FIXA,
  MSG_RESTAURAR_PAI,
  MSG_SEM_ACESSO,
  PROFUNDIDADE,
  corteAberto,
  demandaAberta,
  filtroDemanda,
  nomeOcupado,
  paiVisivel,
  usoBytes,
} from './acesso';
import { apagarSubarvores } from './expurgo';

const MENSAGEM_SEM_ARMAZENAMENTO =
  'O armazenamento de arquivos não está configurado. Use um link externo.';

type Ancora = { tipo: 'demanda' | 'corte'; id: string };

type Destino = { pastaId: string | null; ancora: Ancora | null };

type NoMutavel = {
  id: string;
  kind: 'pasta' | 'arquivo';
  parentId: string | null;
  nome: string;
  demandFileId: string | null;
  url: string | null;
  contentType: string | null;
  byteSize: number | null;
  deliveryId: string | null;
  demandId: string | null;
};

type ArquivoZip = { id: string; nome: string; url: string; tamanho: number };

function unicos(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

function grupoDe(destino: Destino): { grupo: GrupoArquivo; donoId: string } {
  if (destino.ancora?.tipo === 'demanda') return { grupo: 'demandas', donoId: destino.ancora.id };
  if (destino.ancora?.tipo === 'corte') return { grupo: 'cortes', donoId: destino.ancora.id };
  return { grupo: 'drive', donoId: destino.pastaId ?? DONO_RAIZ };
}

async function lerNo(db: Db, id: string, vivos: boolean): Promise<NoMutavel | null> {
  const filtro = vivos ? db`AND n.deleted_at IS NULL` : db`AND n.deleted_at IS NOT NULL`;
  const [linha] = await db<{
    id: string;
    parent_id: string | null;
    kind: 'pasta' | 'arquivo';
    name: string;
    demand_file_id: string | null;
    url: string | null;
    content_type: string | null;
    byte_size: number | null;
    delivery_id: string | null;
    demand_id: string | null;
  }[]>`
    SELECT n.id, n.parent_id, n.kind, n.name, n.demand_file_id, n.url, n.content_type,
           n.byte_size::float8 AS byte_size, f.delivery_id, f.demand_id
    FROM drive_nodes n
    LEFT JOIN demand_files f ON f.id = n.demand_file_id
    WHERE n.id = ${id} ${filtro}`;
  if (!linha) return null;
  return {
    id: linha.id,
    kind: linha.kind,
    parentId: linha.parent_id,
    nome: linha.name,
    demandFileId: linha.demand_file_id,
    url: linha.url,
    contentType: linha.content_type,
    byteSize: linha.byte_size == null ? null : Number(linha.byte_size),
    deliveryId: linha.delivery_id,
    demandId: linha.demand_id,
  };
}

async function materializar(
  db: Db,
  usuario: UsuarioSessao,
  arquivoId: string,
): Promise<NoMutavel> {
  const existente = await db<{ id: string }[]>`
    SELECT id FROM drive_nodes WHERE demand_file_id = ${arquivoId}`;
  if (existente[0]) {
    const no = await lerNo(db, existente[0].id, true);
    if (!no) throw new ErroDominio(MSG_SEM_ACESSO);
    return no;
  }
  const [arquivo] = await db<{
    id: string;
    demand_id: string;
    file_name: string;
    url: string;
    content_type: string;
    byte_size: number;
    delivery_id: string | null;
  }[]>`
    SELECT f.id, f.demand_id, f.file_name, f.url, f.content_type, f.byte_size::float8 AS byte_size, f.delivery_id
    FROM demand_files f
    JOIN demands d ON d.id = f.demand_id
    WHERE f.id = ${arquivoId}
      AND f.deleted_at IS NULL
      AND ${filtroDemanda(db, usuario)}`;
  if (!arquivo) throw new ErroDominio(MSG_SEM_ACESSO);
  const id = novoId('DR');
  await db`
    INSERT INTO drive_nodes (
      id, parent_id, kind, name, demand_file_id, url, content_type, byte_size, created_by
    ) VALUES (
      ${id}, ${arquivo.demand_id}, 'arquivo', ${arquivo.file_name}, ${arquivo.id},
      ${arquivo.url}, ${arquivo.content_type}, ${arquivo.byte_size}, ${usuario.id}
    )`;
  return {
    id,
    kind: 'arquivo',
    parentId: arquivo.demand_id,
    nome: arquivo.file_name,
    demandFileId: arquivo.id,
    url: arquivo.url,
    contentType: arquivo.content_type,
    byteSize: Number(arquivo.byte_size),
    deliveryId: arquivo.delivery_id,
    demandId: arquivo.demand_id,
  };
}

async function carregar(db: Db, usuario: UsuarioSessao, id: string): Promise<
  | { tipo: 'fixa' }
  | { tipo: 'no'; no: NoMutavel }
> {
  const no = await lerNo(db, id, true);
  if (no) return { tipo: 'no', no };
  const porArquivo = await db<{ id: string }[]>`
    SELECT n.id FROM drive_nodes n
    JOIN demand_files f ON f.id = n.demand_file_id
    JOIN demands d ON d.id = f.demand_id
    WHERE f.id = ${id} AND n.deleted_at IS NULL AND f.deleted_at IS NULL AND ${filtroDemanda(db, usuario)}`;
  if (porArquivo[0]) {
    const ligado = await lerNo(db, porArquivo[0].id, true);
    if (!ligado) throw new ErroDominio(MSG_SEM_ACESSO);
    return { tipo: 'no', no: ligado };
  }
  const [arquivo] = await db<{ id: string }[]>`
    SELECT f.id FROM demand_files f
    JOIN demands d ON d.id = f.demand_id
    WHERE f.id = ${id} AND f.deleted_at IS NULL AND ${filtroDemanda(db, usuario)}`;
  if (arquivo) return { tipo: 'no', no: await materializar(db, usuario, arquivo.id) };
  if (await demandaAberta(db, usuario, id)) return { tipo: 'fixa' };
  if (await corteAberto(db, usuario, id)) return { tipo: 'fixa' };
  throw new ErroDominio(MSG_SEM_ACESSO);
}

async function noQualquer(db: Db, id: string) {
  const [linha] = await db<{ kind: string; parent_id: string | null; deleted_at: Date | null }[]>`
    SELECT kind, parent_id, deleted_at FROM drive_nodes WHERE id = ${id}`;
  return linha ?? null;
}

export async function resolverDestino(db: Db, usuario: UsuarioSessao, pastaId: string | null): Promise<Destino> {
  if (pastaId == null) return { pastaId: null, ancora: null };
  const vistos = new Set<string>();
  let atual: string | null = pastaId;
  while (atual) {
    if (vistos.has(atual) || vistos.size > PROFUNDIDADE) throw new ErroDominio(MSG_CICLO);
    vistos.add(atual);
    const pasta = await noQualquer(db, atual);
    if (pasta) {
      if (pasta.deleted_at || pasta.kind !== 'pasta') throw new ErroDominio(MSG_DESTINO);
      atual = pasta.parent_id;
      continue;
    }
    const demanda = await demandaAberta(db, usuario, atual);
    if (demanda) return { pastaId, ancora: { tipo: 'demanda', id: demanda.id } };
    const corte = await corteAberto(db, usuario, atual);
    if (corte) return { pastaId, ancora: { tipo: 'corte', id: corte.id } };
    throw new ErroDominio(MSG_SEM_ACESSO);
  }
  return { pastaId, ancora: null };
}

async function ancestrais(db: Db, pastaId: string | null): Promise<string[]> {
  const ids: string[] = [];
  let atual = pastaId;
  const vistos = new Set<string>();
  while (atual) {
    if (vistos.has(atual) || vistos.size > PROFUNDIDADE) throw new ErroDominio(MSG_CICLO);
    vistos.add(atual);
    ids.push(atual);
    const [no] = await db<{ parent_id: string | null }[]>`
      SELECT parent_id FROM drive_nodes
      WHERE id = ${atual} AND deleted_at IS NULL AND kind = 'pasta'`;
    if (!no) break;
    atual = no.parent_id;
  }
  return ids;
}

async function exigirNome(
  db: Db,
  usuario: UsuarioSessao,
  parentId: string | null,
  nome: string,
  ignorar: readonly string[],
) {
  if (await nomeOcupado(db, usuario, parentId, nome, ignorar)) throw new ErroDominio(MSG_NOME);
}

async function filhosVivos(db: Db, raizes: readonly string[]): Promise<NoMutavel[]> {
  if (raizes.length === 0) return [];
  const linhas = await db<{
    id: string;
    parent_id: string | null;
    kind: 'pasta' | 'arquivo';
    name: string;
    demand_file_id: string | null;
    url: string | null;
    content_type: string | null;
    byte_size: number | null;
    delivery_id: string | null;
    demand_id: string | null;
  }[]>`
    WITH RECURSIVE arvore AS (
      SELECT id, 0 AS nivel FROM drive_nodes WHERE id = ANY(${raizes}) AND deleted_at IS NULL
      UNION ALL
      SELECT n.id, a.nivel + 1
      FROM drive_nodes n
      JOIN arvore a ON n.parent_id = a.id
      WHERE n.deleted_at IS NULL AND a.nivel < ${PROFUNDIDADE}
    )
    SELECT n.id, n.parent_id, n.kind, n.name, n.demand_file_id, n.url, n.content_type,
           n.byte_size::float8 AS byte_size, f.delivery_id, f.demand_id
    FROM drive_nodes n
    JOIN arvore a ON a.id = n.id
    LEFT JOIN demand_files f ON f.id = n.demand_file_id`;
  const vistos = new Set<string>();
  const nos: NoMutavel[] = [];
  for (const linha of linhas) {
    if (vistos.has(linha.id)) continue;
    vistos.add(linha.id);
    nos.push({
      id: linha.id,
      kind: linha.kind,
      parentId: linha.parent_id,
      nome: linha.name,
      demandFileId: linha.demand_file_id,
      url: linha.url,
      contentType: linha.content_type,
      byteSize: linha.byte_size == null ? null : Number(linha.byte_size),
      deliveryId: linha.delivery_id,
      demandId: linha.demand_id,
    });
  }
  return nos;
}

function semDescendentes(nos: readonly NoMutavel[]): NoMutavel[] {
  const ids = new Set(nos.map((no) => no.id));
  const porId = new Map(nos.map((no) => [no.id, no]));
  return nos.filter((no) => {
    let atual = no.parentId;
    const vistos = new Set<string>();
    while (atual && porId.has(atual)) {
      if (vistos.has(atual)) return false;
      vistos.add(atual);
      if (ids.has(atual)) return false;
      atual = porId.get(atual)?.parentId ?? null;
    }
    return true;
  });
}

async function soltarArquivo(db: Db, no: NoMutavel) {
  if (!no.demandFileId) return;
  await db`UPDATE drive_nodes SET demand_file_id = NULL, updated_at = now() WHERE id = ${no.id}`;
  await db`DELETE FROM demand_files WHERE id = ${no.demandFileId}`;
  no.demandFileId = null;
  no.demandId = null;
  no.deliveryId = null;
}

async function prenderArquivo(db: Db, usuario: UsuarioSessao, no: NoMutavel, demandaId: string) {
  if (no.kind !== 'arquivo' || !no.url || !no.contentType || no.byteSize == null) return;
  if (no.demandId === demandaId && no.demandFileId) return;
  if (no.demandFileId && no.demandId && no.demandId !== demandaId) {
    await db`UPDATE demand_files SET demand_id = ${demandaId} WHERE id = ${no.demandFileId}`;
    no.demandId = demandaId;
    return;
  }
  const id = novoId('AR');
  await db`
    INSERT INTO demand_files (id, demand_id, url, file_name, content_type, byte_size, created_by)
    VALUES (${id}, ${demandaId}, ${no.url}, ${no.nome}, ${no.contentType}, ${no.byteSize}, ${usuario.id})`;
  await db`UPDATE drive_nodes SET demand_file_id = ${id}, updated_at = now() WHERE id = ${no.id}`;
  no.demandFileId = id;
  no.demandId = demandaId;
}

async function reatribuir(db: Db, usuario: UsuarioSessao, nos: readonly NoMutavel[], destino: Destino) {
  const demandaDestino = destino.ancora?.tipo === 'demanda' ? destino.ancora.id : null;
  for (const no of nos) {
    if (no.kind !== 'arquivo') continue;
    if (no.deliveryId && demandaDestino !== no.demandId) throw new ErroDominio(MSG_ENTREGA);
    if (demandaDestino === no.demandId) continue;
    if (!demandaDestino) await soltarArquivo(db, no);
    else await prenderArquivo(db, usuario, no, demandaDestino);
  }
}

async function carregarSelecao(db: Db, usuario: UsuarioSessao, ids: readonly string[]): Promise<NoMutavel[]> {
  const nos: NoMutavel[] = [];
  for (const id of unicos(ids)) {
    const alvo = await carregar(db, usuario, id);
    if (alvo.tipo === 'fixa') throw new ErroDominio(MSG_PASTA_FIXA);
    nos.push(alvo.no);
  }
  return semDescendentes(nos);
}

export async function criarPasta(db: Db, usuario: UsuarioSessao, pastaId: string | null, nome: string) {
  const destino = await resolverDestino(db, usuario, pastaId);
  await exigirNome(db, usuario, destino.pastaId, nome, []);
  const id = novoId('DR');
  await db`
    INSERT INTO drive_nodes (id, parent_id, kind, name, created_by)
    VALUES (${id}, ${destino.pastaId}, 'pasta', ${nome}, ${usuario.id})`;
  return id;
}

export async function renomear(db: Db, usuario: UsuarioSessao, id: string, nome: string) {
  const [alvo] = await carregarSelecao(db, usuario, [id]);
  if (!alvo) throw new ErroDominio(MSG_SEM_ACESSO);
  if (alvo.nome.toLowerCase() === nome.toLowerCase()) {
    if (alvo.nome !== nome) {
      await db`UPDATE drive_nodes SET name = ${nome}, updated_at = now() WHERE id = ${alvo.id}`;
      if (alvo.demandFileId) await db`UPDATE demand_files SET file_name = ${nome} WHERE id = ${alvo.demandFileId}`;
    }
    return;
  }
  await exigirNome(db, usuario, alvo.parentId, nome, [alvo.id, alvo.demandFileId].filter((item): item is string => item != null));
  await db`UPDATE drive_nodes SET name = ${nome}, updated_at = now() WHERE id = ${alvo.id}`;
  if (alvo.demandFileId) await db`UPDATE demand_files SET file_name = ${nome} WHERE id = ${alvo.demandFileId}`;
}

export async function mover(db: Db, usuario: UsuarioSessao, ids: readonly string[], pastaId: string | null) {
  const destino = await resolverDestino(db, usuario, pastaId);
  const nos = await carregarSelecao(db, usuario, ids);
  const cadeia = await ancestrais(db, destino.pastaId);
  if (nos.some((no) => no.kind === 'pasta' && cadeia.includes(no.id))) throw new ErroDominio(MSG_CICLO);
  const sub = await filhosVivos(db, nos.map((no) => no.id));
  const nomes = new Set<string>();
  for (const no of nos) {
    const chave = no.nome.toLowerCase();
    if (nomes.has(chave)) throw new ErroDominio(MSG_NOME);
    nomes.add(chave);
    const ignorar = sub.flatMap((item) => [item.id, item.demandFileId].filter((valor): valor is string => valor != null));
    await exigirNome(db, usuario, destino.pastaId, no.nome, ignorar);
  }
  await reatribuir(db, usuario, sub, destino);
  const idsRaiz = nos.map((no) => no.id);
  await db`
    UPDATE drive_nodes SET parent_id = ${destino.pastaId}, updated_at = now()
    WHERE id = ANY(${idsRaiz})`;
}

export async function enviarLixeira(db: Db, usuario: UsuarioSessao, ids: readonly string[]) {
  const nos = await carregarSelecao(db, usuario, ids);
  for (const no of nos) {
    const sub = await filhosVivos(db, [no.id]);
    if (sub.some((item) => item.deliveryId)) throw new ErroDominio(MSG_ENTREGA);
    const alvos = sub.map((item) => item.id);
    const arquivos = sub.map((item) => item.demandFileId).filter((item): item is string => item != null);
    await db`
      UPDATE drive_nodes
      SET deleted_at = now(), trash_root_id = ${no.id}, updated_at = now()
      WHERE id = ANY(${alvos}) AND deleted_at IS NULL`;
    if (arquivos.length > 0) {
      await db`UPDATE demand_files SET deleted_at = now() WHERE id = ANY(${arquivos}) AND deleted_at IS NULL`;
    }
  }
}

export async function restaurar(db: Db, usuario: UsuarioSessao, ids: readonly string[]) {
  for (const id of unicos(ids)) {
    const [raiz] = await db<{ id: string; parent_id: string | null; trash_root_id: string | null }[]>`
      SELECT id, parent_id, trash_root_id FROM drive_nodes
      WHERE id = ${id} AND deleted_at IS NOT NULL`;
    if (!raiz || raiz.trash_root_id !== raiz.id) throw new ErroDominio(MSG_RESTAURAR_PAI);
    if (!(await paiVisivel(db, usuario, raiz.parent_id))) throw new ErroDominio(MSG_SEM_ACESSO);
    await exigirPaiDisponivel(db, usuario, raiz.parent_id);
    const membros = await db<{ id: string; parent_id: string | null; name: string; demand_file_id: string | null }[]>`
      SELECT id, parent_id, name, demand_file_id FROM drive_nodes
      WHERE trash_root_id = ${raiz.id} AND deleted_at IS NOT NULL`;
    const ignorar = membros.flatMap((item) => [item.id, item.demand_file_id].filter((valor): valor is string => valor != null));
    for (const membro of membros) {
      await exigirNome(db, usuario, membro.parent_id, membro.name, ignorar);
    }
    await db`
      UPDATE drive_nodes SET deleted_at = NULL, trash_root_id = NULL, updated_at = now()
      WHERE trash_root_id = ${raiz.id}`;
    const arquivos = membros.map((item) => item.demand_file_id).filter((item): item is string => item != null);
    if (arquivos.length > 0) {
      await db`UPDATE demand_files SET deleted_at = NULL WHERE id = ANY(${arquivos})`;
    }
  }
}

async function exigirPaiDisponivel(db: Db, usuario: UsuarioSessao, parentId: string | null) {
  if (parentId == null) return;
  const [pasta] = await db<{ deleted_at: Date | null; kind: string }[]>`
    SELECT deleted_at, kind FROM drive_nodes WHERE id = ${parentId}`;
  if (pasta) {
    if (pasta.deleted_at || pasta.kind !== 'pasta') throw new ErroDominio(MSG_RESTAURAR_PAI);
    return;
  }
  if (await demandaAberta(db, usuario, parentId)) return;
  if (await corteAberto(db, usuario, parentId)) return;
  throw new ErroDominio(MSG_RESTAURAR_PAI);
}

export async function excluirAgora(db: Db, usuario: UsuarioSessao, ids: readonly string[]) {
  for (const id of unicos(ids)) {
    const [raiz] = await db<{ id: string; parent_id: string | null; trash_root_id: string | null }[]>`
      SELECT id, parent_id, trash_root_id FROM drive_nodes
      WHERE id = ${id} AND deleted_at IS NOT NULL AND trash_root_id = id`;
    if (!raiz || !(await paiVisivel(db, usuario, raiz.parent_id))) throw new ErroDominio(MSG_SEM_ACESSO);
    await apagarSubarvores(db, [raiz.id]);
  }
}

export async function prepararUploadDrive(
  db: Db,
  usuario: UsuarioSessao,
  entrada: { pastaId: string | null; nomeArquivo: string; tipo: string; tamanho: number },
) {
  const destino = await resolverDestino(db, usuario, entrada.pastaId);
  const usado = await usoBytes(db);
  if (usado + entrada.tamanho > env.cotaDriveBytes) throw new ErroDominio(MSG_COTA);
  const { grupo, donoId } = grupoDe(destino);
  return prepararEnvio({ grupo, donoId, nomeArquivo: entrada.nomeArquivo, tipo: entrada.tipo });
}

export async function confirmarUploads(
  db: Db,
  usuario: UsuarioSessao,
  pastaId: string | null,
  arquivos: readonly ItemArquivo[],
) {
  const destino = await resolverDestino(db, usuario, pastaId);
  const cfg = env.armazenamento;
  if (!cfg) throw new ErroDominio(MENSAGEM_SEM_ARMAZENAMENTO);
  const { grupo, donoId } = grupoDe(destino);
  const nomes = new Set<string>();
  let soma = 0;
  for (const arquivo of arquivos) {
    const chave = chaveDaUrl(arquivo.url, cfg.bucket, cfg.regiao);
    if (!chave || !chaveDoDono(chave, grupo, donoId)) throw new ErroDominio(MSG_ARQUIVO_ALHEIO);
    const [gravado] = await db<{ ok: number }[]>`
      SELECT 1 AS ok FROM drive_nodes WHERE url = ${arquivo.url}
      UNION ALL
      SELECT 1 AS ok FROM demand_files WHERE url = ${arquivo.url}
      LIMIT 1`;
    if (gravado) throw new ErroDominio(MSG_JA_GRAVADO);
    const nome = arquivo.nome.trim();
    if (nomes.has(nome.toLowerCase())) throw new ErroDominio(MSG_NOME);
    nomes.add(nome.toLowerCase());
    await exigirNome(db, usuario, destino.pastaId, nome, []);
    soma += arquivo.tamanho;
  }
  const usado = await usoBytes(db);
  if (usado + soma > env.cotaDriveBytes) throw new ErroDominio(MSG_COTA);
  const ids: string[] = [];
  for (const arquivo of arquivos) {
    let demandFileId: string | null = null;
    if (destino.ancora?.tipo === 'demanda') {
      demandFileId = novoId('AR');
      await db`
        INSERT INTO demand_files (id, demand_id, url, file_name, content_type, byte_size, created_by)
        VALUES (
          ${demandFileId}, ${destino.ancora.id}, ${arquivo.url}, ${arquivo.nome.trim()},
          ${arquivo.tipo}, ${arquivo.tamanho}, ${usuario.id}
        )`;
    }
    const id = novoId('DR');
    await db`
      INSERT INTO drive_nodes (
        id, parent_id, kind, name, demand_file_id, url, content_type, byte_size, created_by
      ) VALUES (
        ${id}, ${destino.pastaId}, 'arquivo', ${arquivo.nome.trim()}, ${demandFileId},
        ${arquivo.url}, ${arquivo.tipo}, ${arquivo.tamanho}, ${usuario.id}
      )`;
    ids.push(id);
  }
  return ids;
}

async function arquivosSob(db: Db, parentId: string, prefixo: string, saida: ArquivoZip[], vistos: Set<string>) {
  const pastas = await db<{ id: string; name: string }[]>`
    SELECT id, name FROM drive_nodes
    WHERE parent_id = ${parentId} AND kind = 'pasta' AND deleted_at IS NULL
    ORDER BY name, id`;
  const arquivos = await db<{ id: string; name: string; url: string; byte_size: number }[]>`
    SELECT id, name, url, byte_size::float8 AS byte_size FROM drive_nodes
    WHERE parent_id = ${parentId} AND kind = 'arquivo' AND deleted_at IS NULL
    ORDER BY name, id`;
  for (const arquivo of arquivos) {
    if (vistos.has(arquivo.id)) continue;
    vistos.add(arquivo.id);
    saida.push({ id: arquivo.id, nome: `${prefixo}${arquivo.name}`, url: arquivo.url, tamanho: Number(arquivo.byte_size) });
  }
  const soltos = await db<{ id: string; file_name: string; url: string; byte_size: number }[]>`
    SELECT f.id, f.file_name, f.url, f.byte_size::float8 AS byte_size
    FROM demand_files f
    WHERE f.demand_id = ${parentId}
      AND f.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM drive_nodes n WHERE n.demand_file_id = f.id)`;
  for (const arquivo of soltos) {
    if (vistos.has(arquivo.id)) continue;
    vistos.add(arquivo.id);
    saida.push({
      id: arquivo.id,
      nome: `${prefixo}${arquivo.file_name}`,
      url: arquivo.url,
      tamanho: Number(arquivo.byte_size),
    });
  }
  for (const pasta of pastas) {
    await arquivosSob(db, pasta.id, `${prefixo}${pasta.name}/`, saida, vistos);
  }
}

export async function coletarZip(db: Db, usuario: UsuarioSessao, ids: readonly string[]): Promise<ArquivoZip[]> {
  const saida: ArquivoZip[] = [];
  const vistos = new Set<string>();
  for (const id of unicos(ids)) {
    const no = await lerNo(db, id, true);
    if (no?.kind === 'arquivo' && no.url && no.byteSize != null) {
      if (!vistos.has(no.id)) {
        vistos.add(no.id);
        saida.push({ id: no.id, nome: no.nome, url: no.url, tamanho: no.byteSize });
      }
      continue;
    }
    if (no?.kind === 'pasta') {
      await arquivosSob(db, no.id, `${no.nome}/`, saida, vistos);
      continue;
    }
    const demanda = await demandaAberta(db, usuario, id);
    if (demanda) {
      await arquivosSob(db, demanda.id, `${demanda.title}/`, saida, vistos);
      continue;
    }
    const corte = await corteAberto(db, usuario, id);
    if (corte) {
      await arquivosSob(db, corte.id, `${corte.title}/`, saida, vistos);
      continue;
    }
    const [arquivo] = await db<{ id: string; file_name: string; url: string; byte_size: number }[]>`
      SELECT f.id, f.file_name, f.url, f.byte_size::float8 AS byte_size
      FROM demand_files f
      JOIN demands d ON d.id = f.demand_id
      WHERE f.id = ${id} AND f.deleted_at IS NULL AND ${filtroDemanda(db, usuario)}
        AND NOT EXISTS (SELECT 1 FROM drive_nodes n WHERE n.demand_file_id = f.id)`;
    if (!arquivo) throw new ErroDominio(MSG_SEM_ACESSO);
    if (!vistos.has(arquivo.id)) {
      vistos.add(arquivo.id);
      saida.push({
        id: arquivo.id,
        nome: arquivo.file_name,
        url: arquivo.url,
        tamanho: Number(arquivo.byte_size),
      });
    }
  }
  return deduplicarNomes(saida);
}

function caminhoZip(nome: string): string {
  return nome
    .split('/')
    .filter((parte) => parte.length > 0)
    .map((parte) => parte.replace(/[\\/]/g, '-').replace(/^\.+/, '').slice(0, 120) || 'item')
    .join('/');
}

function deduplicarNomes(arquivos: ArquivoZip[]): ArquivoZip[] {
  const usados = new Set<string>();
  return arquivos.map((arquivo) => {
    const nome = caminhoZip(arquivo.nome) || 'arquivo';
    const barra = nome.lastIndexOf('/');
    const ponto = nome.lastIndexOf('.');
    const ext = ponto > barra ? nome.slice(ponto) : '';
    const base = ext ? nome.slice(0, -ext.length) : nome;
    let candidato = nome;
    let indice = 2;
    while (usados.has(candidato.toLowerCase())) {
      candidato = `${base}-${indice}${ext}`;
      indice += 1;
    }
    usados.add(candidato.toLowerCase());
    return { ...arquivo, nome: candidato };
  });
}
