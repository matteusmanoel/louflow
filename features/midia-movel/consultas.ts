import { db as getDb, type Db } from '@/lib/db';

export type ReservaMidiaMovel = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  reservedBy: string;
  reservedByName: string;
  status: 'Reservada' | 'Finalizada' | 'Cancelada';
  createdAt: Date;
  cancelledAt: Date | null;
  /** Computed: reservation_start <= now() <= reservation_end AND status = 'Reservada' */
  emUso: boolean;
};

/**
 * Lista todas as Reservas de Mídia Móvel.
 * Auto-finaliza as Reservadas cujo fim já passou (mesmo mecanismo de leitura das Captações).
 */
export async function listarReservas(sql: Db = getDb()): Promise<ReservaMidiaMovel[]> {
  // Auto-finalize vencidas on read (idempotente)
  await sql`
    UPDATE media_reservations
       SET status = 'Finalizada'
     WHERE status = 'Reservada' AND ends_at < now()
  `;

  const linhas = await sql<{
    id: string;
    starts_at: Date;
    ends_at: Date;
    reason: string;
    reserved_by: string;
    reserved_by_name: string;
    status: 'Reservada' | 'Finalizada' | 'Cancelada';
    created_at: Date;
    cancelled_at: Date | null;
  }[]>`
    SELECT
      r.id,
      r.starts_at,
      r.ends_at,
      r.reason,
      r.reserved_by,
      u.name AS reserved_by_name,
      r.status,
      r.created_at,
      r.cancelled_at
    FROM media_reservations r
    JOIN users u ON u.id = r.reserved_by
    ORDER BY r.starts_at DESC
  `;

  const agora = new Date();

  return linhas.map((l) => ({
    id: l.id,
    startsAt: l.starts_at,
    endsAt: l.ends_at,
    reason: l.reason,
    reservedBy: l.reserved_by,
    reservedByName: l.reserved_by_name,
    status: l.status,
    createdAt: l.created_at,
    cancelledAt: l.cancelled_at,
    emUso: l.status === 'Reservada' && l.starts_at <= agora && agora <= l.ends_at,
  }));
}
