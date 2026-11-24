-- Resumo diário único no grupo. A hora padrão passa a ser 10.
-- Antecedência e folga permanecem nas colunas, sem uso.

ALTER TABLE notification_settings ALTER COLUMN deadline_hour SET DEFAULT 10;
ALTER TABLE notification_settings ALTER COLUMN pending_hour SET DEFAULT 10;

UPDATE notification_settings
   SET deadline_hour = 10,
       pending_hour = 10,
       updated_at = now()
 WHERE id;

DO $$
DECLARE
  nome text;
BEGIN
  SELECT con.conname INTO nome
  FROM pg_constraint con
  WHERE con.conrelid = 'notification_dispatches'::regclass
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%kind%';
  IF nome IS NOT NULL THEN
    EXECUTE format('ALTER TABLE notification_dispatches DROP CONSTRAINT %I', nome);
  END IF;
END $$;

ALTER TABLE notification_dispatches
  ADD CONSTRAINT notification_dispatches_kind_check
  CHECK (kind IN ('prazo_proximo', 'pendencia_influencer', 'resumo_diario'));
