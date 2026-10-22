import { db, type Db } from '@/lib/db';
import type { UsuarioSessao } from '@/lib/session';

export type StatusCaptacao = 'Agendada' | 'Concluída' | 'Cancelada';

export type Captacao = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  videomakerId: string;
  videomakerNome: string;
  influencerId: string | null;
  influencerNome: string | null;
  client: string | null;
  subject: string | null;
  location: string | null;
  /** Status efetivo: vencidas retornam 'Concluída' sem atualizar o banco (auto-complete on read). */
  status: StatusCaptacao;
  createdBy: string;
  createdAt: Date;
  completedAt: Date | null;
};

type LinhaCaptura = {
  id: string;
  starts_at: Date;
  ends_at: Date;
  videomaker_id: string;
  videomaker_nome: string;
  influencer_id: string | null;
  influencer_nome: string | null;
  client: string | null;
  subject: string | null;
  location: string | null;
  status: string;
  created_by: string;
  created_at: Date;
  completed_at: Date | null;
};

function mapear(linha: LinhaCaptura, agora: Date): Captacao {
  const vencida = linha.status === 'Agendada' && linha.ends_at < agora;
  return {
    id: linha.id,
    startsAt: linha.starts_at,
    endsAt: linha.ends_at,
    videomakerId: linha.videomaker_id,
    videomakerNome: linha.videomaker_nome,
    influencerId: linha.influencer_id,
    influencerNome: linha.influencer_nome,
    client: linha.client,
    subject: linha.subject,
    location: linha.location,
    status: (vencida ? 'Concluída' : linha.status) as StatusCaptacao,
    createdBy: linha.created_by,
    createdAt: linha.created_at,
    completedAt: vencida ? linha.ends_at : linha.completed_at,
  };
}

/** Lista todas as Captações. Vencidas são devolvidas como Concluídas sem tocar o banco. */
export async function listarCaptacoes(sql: Db, usuario: UsuarioSessao): Promise<Captacao[]> {
  void usuario; // permissão verificada na página via exigirModulo
  const linhas = await sql<LinhaCaptura[]>`
    SELECT
      c.id, c.starts_at, c.ends_at,
      c.videomaker_id, v.name AS videomaker_nome,
      c.influencer_id, inf.name AS influencer_nome,
      c.client, c.subject, c.location,
      c.status, c.created_by, c.created_at, c.completed_at
    FROM captures c
    JOIN users v ON v.id = c.videomaker_id
    LEFT JOIN users inf ON inf.id = c.influencer_id
    ORDER BY c.starts_at DESC
  `;
  const agora = new Date();
  return linhas.map((l) => mapear(l, agora));
}

/** Lista todas as Captações (usa db() padrão — para páginas). */
export async function listarCaptacoesDb(usuario: UsuarioSessao): Promise<Captacao[]> {
  return listarCaptacoes(db(), usuario);
}

/** Obtém uma Captação por ID. Vencida é devolvida como Concluída sem tocar o banco. */
export async function obterCaptacao(sql: Db, id: string): Promise<Captacao | null> {
  const [linha] = await sql<LinhaCaptura[]>`
    SELECT
      c.id, c.starts_at, c.ends_at,
      c.videomaker_id, v.name AS videomaker_nome,
      c.influencer_id, inf.name AS influencer_nome,
      c.client, c.subject, c.location,
      c.status, c.created_by, c.created_at, c.completed_at
    FROM captures c
    JOIN users v ON v.id = c.videomaker_id
    LEFT JOIN users inf ON inf.id = c.influencer_id
    WHERE c.id = ${id}
  `;
  if (!linha) return null;
  return mapear(linha, new Date());
}

/** Obtém uma Captação por ID (usa db() padrão — para páginas). */
export async function obterCaptacaoDb(id: string): Promise<Captacao | null> {
  return obterCaptacao(db(), id);
}

export type Videomaker = { id: string; nome: string };

/** Lista Editores ativos como videomakers disponíveis (usa db() padrão — para páginas). */
export async function listarVideomakersDb(): Promise<Videomaker[]> {
  return db()<Videomaker[]>`
    SELECT id, name AS nome FROM users
    WHERE is_active = true AND profile = 'Editor'
    ORDER BY name
  `;
}
