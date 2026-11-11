import 'server-only';
import { db, type Db } from '@/lib/db';

export type CadenciaAvisos = {
  horaPrazo: number;
  antecedenciaDias: number;
  horaPendencia: number;
  folgaHoras: number;
};

export const CADENCIA_PADRAO: CadenciaAvisos = {
  horaPrazo: 8,
  antecedenciaDias: 2,
  horaPendencia: 8,
  folgaHoras: 24,
};

/** Cadência do feed. Sem linha (banco de teste recém-limpo), devolve o padrão. */
export async function lerCadencia(sqlOuNada?: Db): Promise<CadenciaAvisos> {
  const sql = sqlOuNada ?? db();
  const [linha] = await sql<{
    deadline_hour: number;
    deadline_lead_days: number;
    pending_hour: number;
    pending_grace_hours: number;
  }[]>`
    SELECT deadline_hour, deadline_lead_days, pending_hour, pending_grace_hours
    FROM   notification_settings
    WHERE  id
  `;
  if (!linha) return CADENCIA_PADRAO;
  return {
    horaPrazo: linha.deadline_hour,
    antecedenciaDias: linha.deadline_lead_days,
    horaPendencia: linha.pending_hour,
    folgaHoras: linha.pending_grace_hours,
  };
}
