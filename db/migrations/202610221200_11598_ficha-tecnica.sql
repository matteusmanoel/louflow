-- 202610221200_11598_ficha-tecnica: adiciona colunas de metadados técnicos à technical_sheets (S1-11).
-- Aditivo: a tabela já existe em 0001_init. Não altera colunas existentes.

ALTER TABLE technical_sheets
  ADD COLUMN formato              text,
  ADD COLUMN duracao_segundos     integer,
  ADD COLUMN plataformas          text[] NOT NULL DEFAULT '{}',
  ADD COLUMN briefing             text,
  ADD COLUMN observacoes_tecnicas text,
  ADD COLUMN ts_created_at        timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN ts_updated_at        timestamptz NOT NULL DEFAULT now();
