-- Árvore do Drive da equipe. A pasta é metadado: o objeto no bucket não muda de chave.
-- parent_id não tem FK: pode ser um nó, uma Demanda ou um Corte.

ALTER TABLE demand_files ADD COLUMN deleted_at timestamptz;

CREATE INDEX demand_files_vivos_idx ON demand_files (demand_id, created_at) WHERE deleted_at IS NULL;

CREATE TABLE drive_nodes (
  id              text PRIMARY KEY,
  parent_id       text,
  kind            text NOT NULL CHECK (kind IN ('pasta', 'arquivo')),
  name            text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 180),
  demand_file_id  text UNIQUE REFERENCES demand_files(id) ON DELETE CASCADE,
  url             text,
  content_type    text,
  byte_size       bigint CHECK (byte_size IS NULL OR (byte_size > 0 AND byte_size <= 1073741824)),
  created_by      uuid NOT NULL REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  trash_root_id   text,
  CHECK (
    (kind = 'pasta' AND url IS NULL AND content_type IS NULL AND byte_size IS NULL AND demand_file_id IS NULL)
    OR (kind = 'arquivo' AND url IS NOT NULL AND content_type IS NOT NULL AND byte_size IS NOT NULL)
  ),
  CHECK (deleted_at IS NULL OR trash_root_id IS NOT NULL)
);

CREATE UNIQUE INDEX drive_nodes_nome_vivo_uq
  ON drive_nodes (COALESCE(parent_id, ''), lower(name))
  WHERE deleted_at IS NULL;

CREATE INDEX drive_nodes_parent_idx ON drive_nodes (parent_id) WHERE deleted_at IS NULL;
CREATE INDEX drive_nodes_lixeira_idx ON drive_nodes (deleted_at) WHERE deleted_at IS NOT NULL;
