-- Canal de avisos do setor no WhatsApp. O telefone serve só para mencionar no grupo.

ALTER TABLE users
  ADD COLUMN whatsapp text;

ALTER TABLE users
  ADD CONSTRAINT users_whatsapp_chk
  CHECK (whatsapp IS NULL OR whatsapp ~ '^55[0-9]{10,11}$');

-- Uma linha só. O admin define horário e intervalo; o cron externo continua o relógio.
CREATE TABLE notification_settings (
  id                    boolean PRIMARY KEY DEFAULT true CHECK (id),
  deadline_hour         smallint NOT NULL DEFAULT 8 CHECK (deadline_hour BETWEEN 0 AND 23),
  deadline_lead_days    smallint NOT NULL DEFAULT 2 CHECK (deadline_lead_days BETWEEN 1 AND 14),
  pending_hour          smallint NOT NULL DEFAULT 8 CHECK (pending_hour BETWEEN 0 AND 23),
  pending_grace_hours   smallint NOT NULL DEFAULT 24 CHECK (pending_grace_hours BETWEEN 1 AND 168),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES users(id)
);

INSERT INTO notification_settings (id) VALUES (true);

-- Trava de reenvio. A fila de pendências ainda não tem coluna própria de "já avisado".
CREATE TABLE notification_dispatches (
  kind         text NOT NULL CHECK (kind IN ('prazo_proximo', 'pendencia_influencer')),
  subject_key  text NOT NULL CHECK (length(subject_key) BETWEEN 1 AND 200),
  sent_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, subject_key)
);
