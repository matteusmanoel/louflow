-- Arquivos enviados direto ao bucket, agrupados pela Demanda (e, na Entrega, pela versão).

CREATE TABLE demand_files (
  id            text PRIMARY KEY,
  demand_id     text NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  delivery_id   text REFERENCES deliveries(id) ON DELETE CASCADE,
  url           text NOT NULL,
  file_name     text NOT NULL,
  content_type  text NOT NULL,
  byte_size     bigint NOT NULL CHECK (byte_size > 0 AND byte_size <= 1073741824),
  created_by    uuid NOT NULL REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX demand_files_demand_idx ON demand_files (demand_id, created_at);
CREATE INDEX demand_files_delivery_idx ON demand_files (delivery_id) WHERE delivery_id IS NOT NULL;

-- Vários vídeos de um Corte. video_link continua sendo o link principal.
ALTER TABLE clips ADD COLUMN video_links text[] NOT NULL DEFAULT '{}';
