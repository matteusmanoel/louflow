import type { Db } from '@/lib/db';
import type { paraDtoTv } from '@/lib/tv';

export type DadosBrutosTv = Parameters<typeof paraDtoTv>[0];

/** S1-09 (#11564): consultas do Painel de TV. Selecione só as colunas necessárias. */
export async function carregarDadosTv(sql: Db): Promise<DadosBrutosTv> {
  const [resumoRows, demandasPendentes, aprovacoes, agenda, captacoes, cortes] = await Promise.all([
    // Resumo do mês: criadas, concluídas, em andamento e atrasadas
    sql<{ criadas: number; concluidas: number; emAndamento: number; atrasadas: number }[]>`
      SELECT
        COUNT(*) FILTER (
          WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', now())
            AND deleted_at IS NULL
        )::int AS criadas,
        COUNT(*) FILTER (
          WHERE status = 'Concluída'
            AND DATE_TRUNC('month', completed_at) = DATE_TRUNC('month', now())
        )::int AS concluidas,
        COUNT(*) FILTER (
          WHERE status NOT IN ('Concluída', 'Cancelada')
            AND deleted_at IS NULL
        )::int AS "emAndamento",
        COUNT(*) FILTER (
          WHERE post_date < CURRENT_DATE
            AND status NOT IN ('Concluída', 'Cancelada')
            AND deleted_at IS NULL
        )::int AS atrasadas
      FROM demands
    `,

    // Demandas pendentes (ativas): excluídas da Lixeira, Concluída e Cancelada
    sql<{
      id: string; titulo: string; formato: string;
      editor: string | null; influencer: string | null;
      status: string; prioridade: string; prazo: Date | null;
    }[]>`
      SELECT
        d.id,
        d.title          AS titulo,
        d.format         AS formato,
        ue.editor_label  AS editor,
        ui.name          AS influencer,
        d.status,
        d.priority       AS prioridade,
        d.post_date      AS prazo
      FROM demands d
      LEFT JOIN users ue ON ue.id = d.editor_id
      LEFT JOIN users ui ON ui.id = d.influencer_id
      WHERE d.status NOT IN ('Concluída', 'Cancelada')
        AND d.deleted_at IS NULL
      ORDER BY
        CASE d.priority
          WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Normal' THEN 3 ELSE 4
        END,
        d.post_date ASC NULLS LAST
      LIMIT 50
    `,

    // Aprovações: entregas aguardando avaliação
    sql<{
      demandaId: string; titulo: string;
      editor: string | null; influencer: string | null;
      versao: number; desde: Date;
    }[]>`
      SELECT
        del.demand_id     AS "demandaId",
        d.title           AS titulo,
        ue.editor_label   AS editor,
        ui.name           AS influencer,
        del.version       AS versao,
        del.delivered_at  AS desde
      FROM deliveries del
      JOIN demands d ON d.id = del.demand_id
      LEFT JOIN users ue ON ue.id = del.editor_id
      LEFT JOIN users ui ON ui.id = d.influencer_id
      WHERE del.status = 'Aguardando aprovação'
        AND d.deleted_at IS NULL
      ORDER BY del.delivered_at ASC
      LIMIT 20
    `,

    // Agenda: próximos agendamentos (hoje em diante)
    sql<{
      titulo: string; marca: string; plataforma: string;
      quando: Date; situacao: string;
    }[]>`
      SELECT
        title        AS titulo,
        brand        AS marca,
        platform     AS plataforma,
        scheduled_at AS quando,
        status       AS situacao
      FROM post_schedules
      WHERE status = 'Agendada'
        AND scheduled_at >= now()
      ORDER BY scheduled_at ASC
      LIMIT 20
    `,

    // Captações: agendadas a partir de agora
    sql<{
      inicio: Date; fim: Date; videomaker: string;
      cliente: string | null; assunto: string | null; local: string | null;
    }[]>`
      SELECT
        c.starts_at  AS inicio,
        c.ends_at    AS fim,
        u.name       AS videomaker,
        c.client     AS cliente,
        c.subject    AS assunto,
        c.location   AS local
      FROM captures c
      JOIN users u ON u.id = c.videomaker_id
      WHERE c.status = 'Agendada'
        AND c.ends_at >= now()
      ORDER BY c.starts_at ASC
      LIMIT 20
    `,

    // Cortes: em andamento
    sql<{
      titulo: string; linhaEditorial: string; programa: string;
      dataPostagem: Date | null; situacao: string;
    }[]>`
      SELECT
        title          AS titulo,
        editorial_line AS "linhaEditorial",
        source_program AS programa,
        post_date      AS "dataPostagem",
        status         AS situacao
      FROM clips
      WHERE status = 'Em andamento'
      ORDER BY post_date ASC NULLS LAST
      LIMIT 20
    `,
  ]);

  return {
    resumoMes: resumoRows[0] ?? { criadas: 0, concluidas: 0, emAndamento: 0, atrasadas: 0 },
    demandasPendentes,
    aprovacoes,
    agenda,
    captacoes,
    cortes,
  };
}
