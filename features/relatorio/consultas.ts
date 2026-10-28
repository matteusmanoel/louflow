import 'server-only';
import { db } from '@/lib/db';
import { ErroDominio } from '@/lib/errors';
import type { UsuarioSessao } from '@/lib/session';
import { ehDiaCalendario } from './dia';

export type ItemEntrada = {
  id: string;
  titulo: string;
  status: string;
  criadaEm: Date;
  lixeira: boolean;
};

export type ItemMudancaStatus = {
  titulo: string;
  status: string;
  quando: Date;
};

export type ItemConclusao = {
  id: string;
  titulo: string;
  concluidaEm: Date;
  lixeira: boolean;
};

export type ItemAtrasada = {
  id: string;
  titulo: string;
  status: string;
  prazo: string;
};

export type RelatorioDiario = {
  dia: string;
  entraram: ItemEntrada[];
  mudaramStatus: ItemMudancaStatus[];
  concluiram: ItemConclusao[];
  atrasadas: ItemAtrasada[];
};

type LinhaEntrada = {
  id: string;
  titulo: string;
  status: string;
  criada_em: Date;
  lixeira: boolean;
};

type LinhaMudanca = {
  titulo: string;
  status: string;
  quando: Date;
};

type LinhaConclusao = {
  id: string;
  titulo: string;
  concluida_em: Date;
  lixeira: boolean;
};

type LinhaAtrasada = {
  id: string;
  titulo: string;
  status: string;
  prazo: string;
};

/**
 * Relatório de um dia civil em America/Sao_Paulo.
 * Exige `verRelatorios` no usuário recebido (a página também passa por exigirModulo).
 */
export async function obterRelatorioDiario(usuario: UsuarioSessao, dia: string): Promise<RelatorioDiario> {
  if (!usuario.permissoes.verRelatorios) {
    throw new ErroDominio('Você não tem permissão para ver relatórios.');
  }
  if (!ehDiaCalendario(dia)) {
    throw new ErroDominio('Informe o dia no formato AAAA-MM-DD.');
  }

  const sql = db();
  const [entraram, mudaram, concluiram, atrasadas] = await Promise.all([
    sql<LinhaEntrada[]>`
      SELECT
        d.id,
        d.title AS titulo,
        d.status::text AS status,
        d.created_at AS criada_em,
        (d.deleted_at IS NOT NULL) AS lixeira
      FROM demands d
      WHERE (d.created_at AT TIME ZONE 'America/Sao_Paulo')::date = ${dia}::date
      ORDER BY (d.deleted_at IS NOT NULL), d.created_at, d.title
    `,
    sql<LinhaMudanca[]>`
      SELECT
        COALESCE(d.title, 'Demanda removida') AS titulo,
        substr(h.action, 8) AS status,
        h.created_at AS quando
      FROM history h
      LEFT JOIN demands d ON d.id = h.demand_id
      WHERE h.action LIKE 'status:%'
        AND (h.created_at AT TIME ZONE 'America/Sao_Paulo')::date = ${dia}::date
      ORDER BY h.created_at, h.id
    `,
    sql<LinhaConclusao[]>`
      SELECT
        d.id,
        d.title AS titulo,
        d.completed_at AS concluida_em,
        (d.deleted_at IS NOT NULL) AS lixeira
      FROM demands d
      WHERE d.completed_at IS NOT NULL
        AND (d.completed_at AT TIME ZONE 'America/Sao_Paulo')::date = ${dia}::date
      ORDER BY d.completed_at, d.title
    `,
    sql<LinhaAtrasada[]>`
      SELECT
        d.id,
        d.title AS titulo,
        d.status::text AS status,
        COALESCE(d.post_date, d.approval_date)::text AS prazo
      FROM demands d
      WHERE d.deleted_at IS NULL
        AND d.status NOT IN ('Concluída', 'Cancelada', 'Reprovada', 'Aprovação')
        AND COALESCE(d.post_date, d.approval_date) < ${dia}::date
      ORDER BY COALESCE(d.post_date, d.approval_date), d.title
    `,
  ]);

  return {
    dia,
    entraram: entraram.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      status: r.status,
      criadaEm: r.criada_em,
      lixeira: r.lixeira,
    })),
    mudaramStatus: mudaram.map((r) => ({
      titulo: r.titulo,
      status: r.status,
      quando: r.quando,
    })),
    concluiram: concluiram.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      concluidaEm: r.concluida_em,
      lixeira: r.lixeira,
    })),
    atrasadas: atrasadas.map((r) => ({
      id: r.id,
      titulo: r.titulo,
      status: r.status,
      prazo: r.prazo,
    })),
  };
}
