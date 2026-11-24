import 'server-only';
import { db, type Db } from '@/lib/db';
import { formatarData } from '@/lib/datas';
import { env } from '@/lib/env';
import type { UsuarioSessao } from '@/lib/session';
import {
  corteAberto,
  demandaAberta,
  filtroDemanda,
  paiVisivel,
  usoBytes,
} from './acesso';
import { expurgarVencidos } from './expurgo';
import type { CotaDrive, DestinoDrive, ItemDrive, TrilhaDrive, VistaDrive } from './tipos';

type LinhaNo = {
  id: string;
  name: string;
  kind: 'pasta' | 'arquivo';
  url: string | null;
  content_type: string | null;
  byte_size: number | null;
  created_at: Date;
  deleted_at: Date | null;
  delivery_id: string | null;
};

function comparar(a: ItemDrive, b: ItemDrive): number {
  if (a.tipoItem !== b.tipoItem) return a.tipoItem === 'pasta' ? -1 : 1;
  return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
}

function itemNo(linha: LinhaNo, apagado = false): ItemDrive {
  return {
    id: linha.id,
    nome: linha.name,
    tipoItem: linha.kind,
    fixa: false,
    mime: linha.content_type,
    tamanho: linha.byte_size == null ? null : Number(linha.byte_size),
    criadoEm: formatarData(linha.created_at),
    apagadoEm: apagado ? formatarData(linha.deleted_at) : null,
    url: linha.kind === 'arquivo' ? linha.url : null,
    urlDownload: null,
    vinculadoEntrega: linha.delivery_id != null,
  };
}

async function nosDoPai(sql: Db, parentId: string | null): Promise<ItemDrive[]> {
  const linhas = await sql<LinhaNo[]>`
    SELECT n.id, n.name, n.kind, n.url, n.content_type, n.byte_size::float8 AS byte_size,
           n.created_at, n.deleted_at, f.delivery_id
    FROM drive_nodes n
    LEFT JOIN demand_files f ON f.id = n.demand_file_id
    WHERE n.deleted_at IS NULL AND n.parent_id IS NOT DISTINCT FROM ${parentId}
    ORDER BY n.name, n.id`;
  return linhas.map((linha) => itemNo(linha));
}

async function arquivosSoltos(sql: Db, demandaId: string): Promise<ItemDrive[]> {
  const linhas = await sql<{
    id: string;
    file_name: string;
    url: string;
    content_type: string;
    byte_size: number;
    created_at: Date;
    delivery_id: string | null;
  }[]>`
    SELECT f.id, f.file_name, f.url, f.content_type, f.byte_size::float8 AS byte_size, f.created_at, f.delivery_id
    FROM demand_files f
    WHERE f.demand_id = ${demandaId}
      AND f.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM drive_nodes n WHERE n.demand_file_id = f.id)`;
  return linhas.map((linha) => ({
    id: linha.id,
    nome: linha.file_name,
    tipoItem: 'arquivo' as const,
    fixa: false,
    mime: linha.content_type,
    tamanho: Number(linha.byte_size),
    criadoEm: formatarData(linha.created_at),
    apagadoEm: null,
    url: linha.url,
    urlDownload: null,
    vinculadoEntrega: linha.delivery_id != null,
  }));
}

async function demandasVisiveis(sql: Db, usuario: UsuarioSessao) {
  return sql<{ id: string; title: string; format: string; created_at: Date }[]>`
    SELECT d.id, d.title, d.format, d.created_at
    FROM demands d
    WHERE ${filtroDemanda(sql, usuario)}
    ORDER BY d.title, d.id`;
}

async function cortesVisiveis(sql: Db, usuario: UsuarioSessao) {
  if (!usuario.permissoes.verAbaCortes) return [];
  return sql<{ id: string; title: string; created_at: Date }[]>`
    SELECT id, title, created_at FROM clips ORDER BY title, id`;
}

function pastaFixa(id: string, nome: string, criadoEm: Date): ItemDrive {
  return {
    id,
    nome,
    tipoItem: 'pasta',
    fixa: true,
    mime: null,
    tamanho: null,
    criadoEm: formatarData(criadoEm),
    apagadoEm: null,
    url: null,
    urlDownload: null,
    vinculadoEntrega: false,
  };
}

export async function consultarCota(): Promise<CotaDrive> {
  return { usado: await usoBytes(db()), limite: env.cotaDriveBytes };
}

export async function listarRaiz(usuario: UsuarioSessao): Promise<VistaDrive> {
  const sql = db();
  const [demandas, cortes, nos] = await Promise.all([
    demandasVisiveis(sql, usuario),
    cortesVisiveis(sql, usuario),
    nosDoPai(sql, null),
  ]);
  const itens = [
    ...demandas.map((demanda) => pastaFixa(demanda.id, demanda.title, demanda.created_at)),
    ...cortes.map((corte) => pastaFixa(corte.id, corte.title, corte.created_at)),
    ...nos,
  ].sort(comparar);
  return {
    nome: 'Drive',
    detalhe: 'Arquivos da equipe, das Demandas e dos Cortes.',
    trilha: [{ id: null, nome: 'Drive' }],
    itens,
  };
}

export async function abrirPasta(usuario: UsuarioSessao, pastaId: string): Promise<VistaDrive | null> {
  const sql = db();
  const trilha = await montarTrilha(sql, usuario, pastaId);
  if (!trilha) return null;
  const demanda = await demandaAberta(sql, usuario, pastaId);
  if (demanda) {
    const [nos, soltos] = await Promise.all([nosDoPai(sql, pastaId), arquivosSoltos(sql, pastaId)]);
    return {
      nome: demanda.title,
      detalhe: demanda.format,
      trilha,
      itens: [...nos, ...soltos].sort(comparar),
    };
  }
  const corte = await corteAberto(sql, usuario, pastaId);
  if (corte) {
    return {
      nome: corte.title,
      detalhe: 'Corte',
      trilha,
      itens: (await nosDoPai(sql, pastaId)).sort(comparar),
    };
  }
  const [pasta] = await sql<{ name: string }[]>`
    SELECT name FROM drive_nodes WHERE id = ${pastaId} AND kind = 'pasta' AND deleted_at IS NULL`;
  if (!pasta) return null;
  return {
    nome: pasta.name,
    detalhe: 'Pasta',
    trilha,
    itens: (await nosDoPai(sql, pastaId)).sort(comparar),
  };
}

async function pastaViva(sql: Db, id: string) {
  const [linha] = await sql<{ name: string; parent_id: string | null; kind: string }[]>`
    SELECT name, parent_id, kind FROM drive_nodes
    WHERE id = ${id} AND deleted_at IS NULL`;
  return linha ?? null;
}

async function montarTrilha(sql: Db, usuario: UsuarioSessao, pastaId: string): Promise<TrilhaDrive[] | null> {
  const partes: TrilhaDrive[] = [];
  let atual: string | null = pastaId;
  const vistos = new Set<string>();
  while (atual) {
    if (vistos.has(atual) || vistos.size > 40) return null;
    vistos.add(atual);
    const pasta = await pastaViva(sql, atual);
    if (pasta) {
      if (pasta.kind !== 'pasta') return null;
      partes.push({ id: atual, nome: pasta.name });
      atual = pasta.parent_id;
      continue;
    }
    const demanda = await demandaAberta(sql, usuario, atual);
    if (demanda) {
      partes.push({ id: atual, nome: demanda.title });
      break;
    }
    const corte = await corteAberto(sql, usuario, atual);
    if (corte) {
      partes.push({ id: atual, nome: corte.title });
      break;
    }
    return null;
  }
  partes.push({ id: null, nome: 'Drive' });
  return partes.reverse();
}

export async function listarLixeira(usuario: UsuarioSessao): Promise<VistaDrive> {
  const sql = db();
  await expurgarVencidos(sql, new Date());
  const linhas = await sql<LinhaNo[]>`
    SELECT n.id, n.name, n.kind, n.url, n.content_type, n.byte_size::float8 AS byte_size,
           n.created_at, n.deleted_at, n.parent_id, f.delivery_id
    FROM drive_nodes n
    LEFT JOIN demand_files f ON f.id = n.demand_file_id
    WHERE n.deleted_at IS NOT NULL AND n.trash_root_id = n.id
    ORDER BY n.deleted_at DESC, n.name`;
  const itens: ItemDrive[] = [];
  for (const linha of linhas) {
    const parentId = (linha as LinhaNo & { parent_id: string | null }).parent_id;
    if (!(await paiVisivel(sql, usuario, parentId))) continue;
    itens.push(itemNo(linha, true));
  }
  return {
    nome: 'Lixeira',
    detalhe: 'Itens excluídos são apagados depois de 30 dias. Restaurar devolve o item para a pasta de origem.',
    trilha: [
      { id: null, nome: 'Drive' },
      { id: 'lixeira', nome: 'Lixeira' },
    ],
    itens,
  };
}

export async function listarDestinos(usuario: UsuarioSessao): Promise<DestinoDrive[]> {
  const sql = db();
  const [demandas, cortes, pastas] = await Promise.all([
    demandasVisiveis(sql, usuario),
    cortesVisiveis(sql, usuario),
    sql<{ id: string; parent_id: string | null; name: string }[]>`
      SELECT id, parent_id, name FROM drive_nodes
      WHERE kind = 'pasta' AND deleted_at IS NULL`,
  ]);
  const porId = new Map(pastas.map((pasta) => [pasta.id, pasta]));
  const demandasIds = new Set(demandas.map((demanda) => demanda.id));
  const cortesIds = new Set(cortes.map((corte) => corte.id));

  function visivel(id: string | null, vistos = new Set<string>()): boolean {
    if (!id) return true;
    if (vistos.has(id)) return false;
    vistos.add(id);
    const pasta = porId.get(id);
    if (pasta) return visivel(pasta.parent_id, vistos);
    if (demandasIds.has(id) || cortesIds.has(id)) return true;
    return false;
  }

  function rotulo(id: string | null, vistos = new Set<string>()): string {
    if (!id) return 'Drive';
    if (vistos.has(id)) return 'Pasta';
    vistos.add(id);
    const pasta = porId.get(id);
    if (pasta) return `${rotulo(pasta.parent_id, vistos)} / ${pasta.name}`;
    return demandas.find((demanda) => demanda.id === id)?.title
      ?? cortes.find((corte) => corte.id === id)?.title
      ?? 'Pasta';
  }

  const destinos: DestinoDrive[] = [
    { id: null, rotulo: 'Drive' },
    ...demandas.map((demanda) => ({ id: demanda.id, rotulo: demanda.title })),
    ...cortes.map((corte) => ({ id: corte.id, rotulo: corte.title })),
    ...pastas.filter((pasta) => visivel(pasta.id)).map((pasta) => ({ id: pasta.id, rotulo: rotulo(pasta.id) })),
  ];
  const raiz = destinos[0]!;
  const resto = destinos.slice(1).sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR', { sensitivity: 'base' }));
  return [raiz, ...resto];
}
