import { db, type Db } from '@/lib/db';
import type { UsuarioSessao } from '@/lib/session';

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

export type FichaEnviada = {
  identificacao: string | null;
  observacaoEditor: string | null;
  previsaoPublicacao: string | null;
  roteiro: string | null;
  cabeca: string | null;
  sonora: string | null;
  informacoes: string | null;
  linkArquivos: string | null;
  roteiroEscrito: string | null;
  gcLettering: string | null;
  materialSsd: string | null;
  plataforma: string | null;
  formatoConteudo: string | null;
  referenciasVisuais: string | null;
  editorSugerido: string | null;
  enviadaPor: string;
  enviadaEm: Date;
};

type DonoDaDemanda = { influencer_id: string | null; editor_id: string | null; format: string };

/**
 * Quem lê a ficha enviada pelo Influencer: Administrador (ou quem vê todas as Demandas), o
 * Influencer que a enviou, o Editor da Demanda e, enquanto a Demanda está na Fila de Fichas
 * (formato Ficha técnica, sem Editor), qualquer Editor (PRD §4.5). Demais perfis, nunca.
 */
export function podeLerFichaEnviada(usuario: UsuarioSessao, demanda: DonoDaDemanda): boolean {
  if (usuario.perfil === 'Administrador' || usuario.permissoes.verTodasDemandas) return true;
  if (demanda.influencer_id === usuario.id) return true;
  if (usuario.perfil !== 'Editor') return false;
  if (demanda.editor_id === usuario.id) return true;
  return demanda.editor_id === null && demanda.format === 'Ficha técnica';
}

type LinhaFichaEnviada = {
  identification: string | null;
  editor_note: string | null;
  expected_publication: Date | null;
  script: string | null;
  opening: string | null;
  sound_bite: string | null;
  information: string | null;
  files_link: string | null;
  written_script: string | null;
  gc_lettering: string | null;
  ssd_material: string | null;
  platform: string | null;
  content_format: string | null;
  visual_references: string | null;
  editor_sugerido: string | null;
  enviada_por: string;
  sent_at: Date;
};

/** Ficha enviada pelo Influencer, ou null se não houver ou se a Sessão não puder ler (checado aqui, no servidor). */
export async function obterFichaEnviada(
  sql: Db,
  demandaId: string,
  usuario: UsuarioSessao,
): Promise<FichaEnviada | null> {
  const [dono] = await sql<DonoDaDemanda[]>`
    SELECT influencer_id, editor_id, format FROM demands
     WHERE id = ${demandaId} AND deleted_at IS NULL`;
  if (!dono || !podeLerFichaEnviada(usuario, dono)) return null;

  const [l] = await sql<LinhaFichaEnviada[]>`
    SELECT ts.identification, ts.editor_note, ts.expected_publication, ts.script, ts.opening,
           ts.sound_bite, ts.information, ts.files_link, ts.written_script, ts.gc_lettering,
           ts.ssd_material, ts.platform, ts.content_format, ts.visual_references,
           COALESCE(NULLIF(se.editor_label, ''), se.name) AS editor_sugerido,
           COALESCE(NULLIF(ub.editor_label, ''), ub.name) AS enviada_por,
           ts.sent_at
      FROM technical_sheets ts
      JOIN users ub ON ub.id = ts.sent_by
      LEFT JOIN users se ON se.id = ts.suggested_editor_id
     WHERE ts.demand_id = ${demandaId}
       AND ts.identification IS NOT NULL`;
  if (!l) return null;
  const dia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  return {
    identificacao: l.identification,
    observacaoEditor: l.editor_note,
    previsaoPublicacao: dia(l.expected_publication),
    roteiro: l.script,
    cabeca: l.opening,
    sonora: l.sound_bite,
    informacoes: l.information,
    linkArquivos: l.files_link,
    roteiroEscrito: l.written_script,
    gcLettering: l.gc_lettering,
    materialSsd: l.ssd_material,
    plataforma: l.platform,
    formatoConteudo: l.content_format,
    referenciasVisuais: l.visual_references,
    editorSugerido: l.editor_sugerido,
    enviadaPor: l.enviada_por,
    enviadaEm: l.sent_at,
  };
}

export async function obterFichaEnviadaDb(demandaId: string, usuario: UsuarioSessao): Promise<FichaEnviada | null> {
  return obterFichaEnviada(db(), demandaId, usuario);
}
