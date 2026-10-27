# Schema Postgres — LouFlow

> **Referência de modelagem, não migration executável.** A primeira migration real nasce deste documento num PR revisado pela TI (zona protegida `db/migrations/`). Derivado dos `CONFIG.CABECALHOS_*` do código de **produção** (`clasp pull` de 21 out 2026).
>
> Convenções:
>
> - nomes em inglês `snake_case`;
> - datas e horas em `timestamptz`; datas puras em `date`. O fuso de exibição é America/Sao_Paulo;
> - texto de domínio (Status, Situação) gravado com o rótulo canônico em português, igual ao que o usuário vê;
> - colunas `Email` duplicadas das abas viram FK para `users`, sem cópia de e-mail.

## 0. Diferenças em relação ao plano

O plano previa 23 tabelas. Este schema tem **26**. As três a mais vêm da produção:

| Tabela extra | Motivo |
|---|---|
| `clips` | A aba `Cortes` existe em produção, com fluxo próprio (`salvarCorte` e `concluirCorte`) |
| `error_log` | A aba `Registro_Erros` existe e recebe `registrarErroCliente` |
| `approval_delegations` | `Editores para aprovar` é uma lista N:N; numa coluna de texto ela perderia a integridade referencial |

**Não migram:**

- as 71 abas `Backup_*`, substituídas pelo backup gerenciado da Neon;
- a aba `Ranking`, que é derivada e vira query;
- a aba `Concluidos`, que é derivada (`demands WHERE status = 'Concluída'`).

**`Listas` se divide em três destinos:**

- Formatos vão para `system_lists`.
- Editores e Influencers viram `users`.
- Status vira o enum `demand_status`.

## 1. Extensões e tipos

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist; -- EXCLUDE com igualdade + intervalo
CREATE EXTENSION IF NOT EXISTS citext;     -- e-mail case-insensitive

CREATE TYPE user_profile AS ENUM ('Administrador', 'Editor', 'Influencer', 'Premios');

CREATE TYPE demand_status AS ENUM (
  'Não iniciada', 'Em execução', 'Pausada', 'Aprovação',
  'Ajustes solicitados', 'Concluída', 'Reprovada', 'Cancelada'
);
-- A produção aceita 'Aprovação' e 'Aguardando aprovação' como equivalentes.
-- A importação normaliza as duas formas para 'Aprovação'.

CREATE TYPE demand_priority AS ENUM ('Baixa', 'Normal', 'Alta', 'Urgente');
```

## 2. Acesso

```sql
-- Aba: Usuarios (Nome, Email, Editor, Perfil, PIN, Ativo)
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           citext NOT NULL UNIQUE,
  editor_label    text,                 -- coluna "Editor": nome exibido nas Demandas
  profile         user_profile NOT NULL,
  pin_hash        text,                 -- NULL = sem PIN (reset pendente ou inativo sem conta)
  must_reset_pin  boolean NOT NULL DEFAULT true,
  is_active       boolean NOT NULL DEFAULT true,
  access_version  integer NOT NULL DEFAULT 1,   -- substitui VERSAO_ACESSO_<email>
  failed_logins   smallint NOT NULL DEFAULT 0,
  locked_until    timestamptz,                  -- 5 falhas → +15 min
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_editor_label_uq ON users (lower(editor_label)) WHERE editor_label IS NOT NULL;

-- Aba: Permissoes_Usuarios (Permissoes JSON). Guarda só o desvio em relação ao padrão do Perfil.
-- Ausência de linha = vale o padrão do Perfil (lib/permissions.ts).
CREATE TABLE user_permissions (
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key  text NOT NULL CHECK (permission_key IN (
    'criarDemandas','definirOutroEditor','verTodasDemandas','editarDemandas',
    'atribuirEditor','alterarStatus','alterarPrioridade','excluirDemandas',
    'enviarFicha','verAgenda','gerenciarAgenda','verCaptacoes','gerenciarCaptacoes',
    'acessarCortes','verAbaCortes','verRelatorios','usarAnalista','gerenciarUsuarios',
    'verLixeira','verSorteios',
    -- novas: substituem regras que hoje dependem de nome próprio (D9)
    'operarDrone','editorPadraoCortes','notaInformativaRanking'
  )),
  granted         boolean NOT NULL,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid REFERENCES users(id),
  PRIMARY KEY (user_id, permission_key)
);
-- Só um Usuário pode ser o Editor padrão de Cortes.
CREATE UNIQUE INDEX user_permissions_one_clips_editor
  ON user_permissions (permission_key) WHERE permission_key = 'editorPadraoCortes' AND granted;

-- Aba: Permissoes_Usuarios (Editores para aprovar) — Aprovador Delegado
CREATE TABLE approval_delegations (
  approver_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  editor_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (approver_id, editor_id),
  CHECK (approver_id <> editor_id)
);

-- Substitui CacheService SESSAO_<token>. Guarda só o digest do token, nunca o token.
CREATE TABLE session_tokens (
  token_digest    text PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_version  integer NOT NULL,     -- divergente de users.access_version = sessão inválida
  expires_at      timestamptz NOT NULL, -- deslizante: now() + 6 h a cada uso
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX session_tokens_user_idx ON session_tokens (user_id);
CREATE INDEX session_tokens_expires_idx ON session_tokens (expires_at);

-- Substitui PropertiesService DISPOSITIVO_<token>. 30 dias.
CREATE TABLE trusted_devices (
  token_digest    text PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_version  integer NOT NULL,
  expires_at      timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz
);
CREATE INDEX trusted_devices_user_idx ON trusted_devices (user_id);

-- Aba: Preferencias_Notificacao
CREATE TABLE notification_preferences (
  user_id             uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  editor_assigned     boolean NOT NULL DEFAULT true,  -- Editor atribuido
  status_changed      boolean NOT NULL DEFAULT true,  -- Mudanca de status
  new_comment         boolean NOT NULL DEFAULT true,  -- Novo comentario
  adjustment_request  boolean NOT NULL DEFAULT true,  -- Solicitacao de ajuste
  completed_approved  boolean NOT NULL DEFAULT true,  -- Conclusao ou aprovacao
  deadline_near       boolean NOT NULL DEFAULT true,  -- Prazo proximo
  updated_at          timestamptz NOT NULL DEFAULT now()
);
-- Default true = confirmar no ensaio que equivale ao comportamento atual sem linha.
```

## 3. Demandas

```sql
-- Aba: Listas (coluna Formato). Outras listas fixas do código podem entrar aqui aditivamente.
CREATE TABLE system_lists (
  id         serial PRIMARY KEY,
  kind       text NOT NULL CHECK (kind IN ('formato')),
  value      text NOT NULL,
  position   smallint NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  UNIQUE (kind, value)
);

-- Aba: Base_Demandas (16 colunas em produção)
CREATE TABLE demands (
  id               text PRIMARY KEY,          -- preserva o formato 'LF' + 10 hex dos IDs migrados
  title            text NOT NULL,             -- Tarefa
  format           text NOT NULL,             -- Formato; validado contra system_lists
  influencer_id    uuid REFERENCES users(id),
  editor_id        uuid REFERENCES users(id), -- NULL = "A definir"
  status           demand_status NOT NULL DEFAULT 'Não iniciada',
  approval_date    date,                      -- Data para aprovação
  post_date        date,                      -- Data de postagem
  info             text,
  link             text,                      -- URL externa (Drive/WeTransfer)
  priority         demand_priority NOT NULL DEFAULT 'Normal',
  editorial_line   text CHECK (editorial_line IN ('Viral','Comunidade','Educacional')),
  source_program   text,                      -- Programa de origem
  clips_count      smallint CHECK (clips_count BETWEEN 1 AND 999), -- Quantidade de cortes
  created_by       uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,               -- Concluída em
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,               -- não NULL = está na Lixeira
  CHECK ((status = 'Concluída') = (completed_at IS NOT NULL)) -- confirmar no ensaio de migração
);
CREATE INDEX demands_status_idx            ON demands (status) WHERE deleted_at IS NULL;
CREATE INDEX demands_editor_status_idx     ON demands (editor_id, status) WHERE deleted_at IS NULL;
CREATE INDEX demands_influencer_status_idx ON demands (influencer_id, status) WHERE deleted_at IS NULL;
CREATE INDEX demands_completed_at_idx      ON demands (completed_at) WHERE status = 'Concluída';
CREATE INDEX demands_queue_idx             ON demands (created_at)
  WHERE editor_id IS NULL AND deleted_at IS NULL;  -- Fila de Fichas

-- Aba: Lixeira_Demandas. Hoje a linha inteira é copiada para outra aba.
-- Destino: soft delete em demands.deleted_at + registro de quem excluiu.
-- Comentários, Histórico e Entregas continuam ligados à Demanda.
CREATE TABLE demand_trash (
  demand_id   text PRIMARY KEY REFERENCES demands(id) ON DELETE CASCADE,
  deleted_at  timestamptz NOT NULL DEFAULT now(),
  deleted_by  uuid NOT NULL REFERENCES users(id)
);
-- Restaurar = DELETE em demand_trash + deleted_at = NULL (mesma transação).
-- Excluir definitivamente = DELETE em demands (cascata).

-- Aba: Fichas_Tecnicas (21 colunas em produção)
CREATE TABLE technical_sheets (
  demand_id             text PRIMARY KEY REFERENCES demands(id) ON DELETE CASCADE,
  submission_key        text UNIQUE,      -- Chave: idempotência do envio
  identification        text,
  editor_note           text,             -- Observacao para o editor
  expected_publication  date,             -- Previsao de publicacao
  script                text,             -- Roteiro
  opening               text,             -- Cabeca
  sound_bite            text,             -- Sonora
  information           text,             -- Informacoes
  files_link            text,             -- Link de arquivos (URL externa)
  written_script        text,             -- Roteiro escrito
  gc_lettering          text,             -- GC ou Lettering
  ssd_material          text,             -- Material em SSD
  platform              text,
  content_format        text,             -- Formato do conteudo
  visual_references     text,             -- Referencias visuais
  suggested_editor_id   uuid REFERENCES users(id), -- Editor sugerido
  sent_by               uuid NOT NULL REFERENCES users(id),
  sent_at               timestamptz NOT NULL DEFAULT now()
);

-- Aba: Entregas
CREATE TABLE deliveries (
  id              text PRIMARY KEY,
  demand_id       text NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  version         smallint NOT NULL CHECK (version >= 1),
  link            text NOT NULL,
  note            text,
  editor_id       uuid NOT NULL REFERENCES users(id),
  delivered_at    timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'Aguardando aprovação' CHECK (status IN (
                    'Aguardando aprovação','Aprovada','Ajustes solicitados',
                    'Concluída administrativamente')),  -- demais valores: confirmar no ensaio
  reason          text,                -- Motivo (obrigatório em ajustes)
  evaluated_at    timestamptz,
  evaluated_by    uuid REFERENCES users(id),
  UNIQUE (demand_id, version),
  CHECK (status <> 'Ajustes solicitados' OR reason IS NOT NULL)
);
CREATE INDEX deliveries_pending_idx ON deliveries (demand_id) WHERE status = 'Aguardando aprovação';

-- Aba: Ciclos_Edicao
CREATE TABLE editing_cycles (
  id           text PRIMARY KEY,
  demand_id    text NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  version      smallint NOT NULL,
  editor_id    uuid NOT NULL REFERENCES users(id),
  started_at   timestamptz NOT NULL,
  ended_at     timestamptz,
  paused_ms    bigint NOT NULL DEFAULT 0,
  active_ms    bigint,                 -- calculado ao encerrar: (fim - início) - pausado
  status       text NOT NULL CHECK (status IN ('Em andamento','Concluído','Interrompido')), -- confirmar 'Interrompido'
  end_reason   text,
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);
-- Invariante: no máximo um Ciclo aberto por Demanda.
CREATE UNIQUE INDEX editing_cycles_open_uq ON editing_cycles (demand_id) WHERE ended_at IS NULL;
CREATE INDEX editing_cycles_editor_idx ON editing_cycles (editor_id, ended_at);

-- Aba: Pausas_Demandas
CREATE TABLE demand_pauses (
  id          text PRIMARY KEY,
  demand_id   text NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  paused_at   timestamptz NOT NULL,
  resumed_at  timestamptz,
  user_id     uuid NOT NULL REFERENCES users(id),
  CHECK (resumed_at IS NULL OR resumed_at >= paused_at)
);
-- Invariante: no máximo uma Pausa aberta por Demanda.
CREATE UNIQUE INDEX demand_pauses_open_uq ON demand_pauses (demand_id) WHERE resumed_at IS NULL;

-- Aba: Comentarios
CREATE TABLE comments (
  id          text PRIMARY KEY,
  demand_id   text NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES users(id),
  body        text NOT NULL CHECK (length(body) > 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_demand_idx ON comments (demand_id, created_at);
```

## 4. Rastreabilidade

```sql
-- Aba: Historico (~1 646 linhas em out 2026)
-- max(id) é a "revisão" usada pelo polling em /api/sync (system-design §5).
CREATE TABLE history (
  id          bigserial PRIMARY KEY,
  demand_id   text REFERENCES demands(id) ON DELETE SET NULL,
  action      text NOT NULL,
  user_id     uuid REFERENCES users(id),
  details     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX history_demand_idx ON history (demand_id, created_at);

-- Aba: Auditoria_Administrativa
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  action      text NOT NULL,
  user_id     uuid REFERENCES users(id),
  target      text,
  details     text,
  before      text,
  after       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);

-- Aba: Registro_Erros. Nunca grava PIN, token, cabeçalho ou payload de formulário.
CREATE TABLE error_log (
  id          bigserial PRIMARY KEY,
  origin      text NOT NULL,           -- 'cliente' | 'servidor' | 'cron:<job>'
  message     text NOT NULL,
  details     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

## 5. Postagem e pendências

```sql
-- Aba: Agendamentos_Postagem
CREATE TABLE post_schedules (
  id             text PRIMARY KEY,
  demand_id      text REFERENCES demands(id) ON DELETE SET NULL, -- NULL = agendamento avulso
  influencer_id  uuid REFERENCES users(id),
  title          text NOT NULL,                 -- Tarefa
  platform       text NOT NULL,
  scheduled_at   timestamptz NOT NULL,          -- Data e hora
  status         text NOT NULL DEFAULT 'Agendada' CHECK (status IN ('Agendada','Publicada','Cancelada')),
  brand          text NOT NULL CHECK (brand IN (
                   'Loumar','ClickFoz','Apaixonados por Foz','LoumarTV',
                   'Ailabiu','Ticket Loko','City Tour')),
  content_type   text,                          -- Tipo de conteúdo
  scheduled_by   uuid NOT NULL REFERENCES users(id), -- Agendado por / Email do responsavel
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_schedules_when_idx ON post_schedules (scheduled_at) WHERE status = 'Agendada';

-- Aba: Agendamentos_Obrigatorios. Criado quando uma Entrega é aprovada.
CREATE TABLE mandatory_schedules (
  id                text PRIMARY KEY,
  demand_id         text NOT NULL REFERENCES demands(id) ON DELETE CASCADE,
  influencer_id     uuid NOT NULL REFERENCES users(id),
  title             text NOT NULL,
  version           smallint NOT NULL,
  status            text NOT NULL DEFAULT 'Pendente', -- observados: Pendente, Agendada; demais no ensaio
  created_at        timestamptz NOT NULL DEFAULT now(),
  resolved_at       timestamptz,
  post_schedule_id  text REFERENCES post_schedules(id)
);
CREATE UNIQUE INDEX mandatory_schedules_open_uq
  ON mandatory_schedules (demand_id) WHERE status = 'Pendente';

-- Aba: Adiamentos_Influencer
CREATE TABLE influencer_deferrals (
  id                 text PRIMARY KEY,
  influencer_id      uuid NOT NULL REFERENCES users(id),
  kind               text NOT NULL,            -- Tipo: aprovação | agendamento
  pending_key        text NOT NULL,            -- Chave da pendencia (ex.: 'aprovacao:<id>:<ts>')
  demand_id          text REFERENCES demands(id) ON DELETE CASCADE,
  title              text,
  reason             text NOT NULL CHECK (length(reason) BETWEEN 8 AND 500),
  registered_at      timestamptz NOT NULL DEFAULT now(),
  resume_at          timestamptz NOT NULL,     -- 5 min a 48 h após o registro (regra no domínio)
  reminder_sent_at   timestamptz,              -- trava de idempotência do cron
  admin_notified_at  timestamptz,              -- trava de idempotência do cron
  status             text NOT NULL CHECK (status IN (
                       'Pendente','Prazo padrão','Em atraso','Prazo padrão em atraso',
                       'Resolvida','Substituida'))
);
CREATE INDEX influencer_deferrals_due_idx ON influencer_deferrals (resume_at)
  WHERE status IN ('Pendente','Prazo padrão');
CREATE INDEX influencer_deferrals_key_idx ON influencer_deferrals (pending_key);
-- O prazo padrão de 24 h também gera linha (motivo fixo do sistema, status 'Prazo padrão').
```

## 6. Recursos operacionais

```sql
-- Aba: Captacoes
CREATE TABLE captures (
  id             text PRIMARY KEY,
  starts_at      timestamptz NOT NULL,
  ends_at        timestamptz NOT NULL,
  videomaker_id  uuid NOT NULL REFERENCES users(id),
  influencer_id  uuid REFERENCES users(id),
  client         text,
  subject        text,
  location       text,
  status         text NOT NULL DEFAULT 'Agendada' CHECK (status IN ('Agendada','Concluída','Cancelada')),
  created_by     uuid NOT NULL REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  CHECK (ends_at > starts_at),
  -- Invariante: videomaker sem Captações Agendadas sobrepostas.
  EXCLUDE USING gist (videomaker_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
    WHERE (status = 'Agendada')
);
CREATE INDEX captures_due_idx ON captures (ends_at) WHERE status = 'Agendada';

-- Aba: Reservas_Midia_Movel
CREATE TABLE media_reservations (
  id            text PRIMARY KEY,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  reason        text NOT NULL,             -- Motivo de uso
  reserved_by   uuid NOT NULL REFERENCES users(id),
  status        text NOT NULL DEFAULT 'Reservada' CHECK (status IN ('Reservada','Finalizada','Cancelada')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  cancelled_at  timestamptz,
  CHECK (ends_at > starts_at),
  -- Invariante: um único veículo, sem Reservas sobrepostas.
  EXCLUDE USING gist (tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'Reservada')
);
CREATE INDEX media_reservations_due_idx ON media_reservations (ends_at) WHERE status = 'Reservada';

-- Aba: Uso_Drone
CREATE TABLE drone_usages (
  id               text PRIMARY KEY,
  used_on          date NOT NULL,           -- data futura é rejeitada no domínio (não em CHECK: now() não é imutável)
  responsible      text NOT NULL,           -- Responsavel (texto livre, como hoje)
  served_profile   text NOT NULL,           -- Perfil atendido
  reason           text NOT NULL,
  location         text NOT NULL,
  amount_cents     integer NOT NULL DEFAULT 25000 CHECK (amount_cents = 25000), -- R$ 250 fixo
  status           text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo','Cancelado')),
  origin           text NOT NULL DEFAULT 'LouFlow',
  dedupe_key       text NOT NULL,           -- data|responsável|perfil|motivo|local normalizados pela aplicação
  version          integer NOT NULL DEFAULT 1, -- concorrência otimista
  created_by       uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES users(id),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
-- Invariante: não existem dois usos Ativos iguais.
CREATE UNIQUE INDEX drone_usages_dedupe_uq ON drone_usages (dedupe_key) WHERE status = 'Ativo';

-- Aba: Cortes
CREATE TABLE clips (
  id              text PRIMARY KEY,
  title           text NOT NULL,
  influencer_id   uuid REFERENCES users(id),
  editor_id       uuid NOT NULL REFERENCES users(id),  -- Editor padrão de Cortes no momento da criação
  post_date       date NOT NULL,
  editorial_line  text NOT NULL CHECK (editorial_line IN ('Viral','Comunidade','Educacional')),
  video_link      text,
  source_program  text NOT NULL CHECK (source_program IN ('Destino Iguaçu News','Descubra Foz','Outros')),
  status          text NOT NULL DEFAULT 'Em andamento' CHECK (status IN ('Em andamento','Concluído')),
  clips_count     smallint CHECK (clips_count BETWEEN 1 AND 999),
  created_by      uuid NOT NULL REFERENCES users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  CHECK (status <> 'Concluído' OR clips_count IS NOT NULL)
);
CREATE INDEX clips_status_idx ON clips (status, post_date);
```

## 7. Conteúdo e complementares

```sql
-- Aba: Regras_Wiki
CREATE TABLE wiki_articles (
  id            text PRIMARY KEY,
  category      text NOT NULL,
  title         text NOT NULL,
  summary       text,
  content       text NOT NULL CHECK (length(content) <= 15000),
  position      smallint NOT NULL CHECK (position BETWEEN 1 AND 999),
  is_published  boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES users(id)
);
CREATE INDEX wiki_articles_published_idx ON wiki_articles (category, position) WHERE is_published;

-- Aba: Sorteios_Premios
CREATE TABLE raffles (
  id                   text PRIMARY KEY,
  winner_name          text NOT NULL,     -- pessoa externa: dado pessoal, nunca vai para a TV
  month                text NOT NULL,     -- Mes (formato a confirmar no ensaio)
  campaign             text NOT NULL,     -- Campanha ou programa
  prize                text NOT NULL,
  retrieved            boolean NOT NULL DEFAULT false,
  retrieval_deadline   date,
  notes                text,
  created_by           uuid REFERENCES users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  retrieved_by         uuid REFERENCES users(id),  -- Retirada registrada por
  retrieved_at         timestamptz,                -- Retirada registrada em
  origin               text NOT NULL DEFAULT 'LouFlow', -- ou 'Importação histórica'
  CHECK (retrieved = (retrieved_at IS NOT NULL))
);
CREATE INDEX raffles_pending_idx ON raffles (retrieval_deadline) WHERE NOT retrieved;
```

## 8. Equivalência aba → tabela

| Aba (produção) | Tabela | Observação |
|---|---|---|
| `Base_Demandas` | `demands` | Lixeira por soft delete |
| `Listas` | `system_lists`, `users`, enum | Ver §0 |
| `Concluidos` | — | Query |
| `Ranking` | — | Query |
| `Usuarios` | `users` | PIN não migra |
| `Permissoes_Usuarios` | `user_permissions`, `approval_delegations` | JSON vira linhas |
| `Comentarios` | `comments` | |
| `Historico` | `history` | |
| `Fichas_Tecnicas` | `technical_sheets` | |
| `Entregas` | `deliveries` | |
| `Ciclos_Edicao` | `editing_cycles` | |
| `Pausas_Demandas` | `demand_pauses` | |
| `Preferencias_Notificacao` | `notification_preferences` | |
| `Lixeira_Demandas` | `demand_trash` + `demands.deleted_at` | |
| `Registro_Erros` | `error_log` | |
| `Agendamentos_Postagem` | `post_schedules` | |
| `Agendamentos_Obrigatorios` | `mandatory_schedules` | |
| `Adiamentos_Influencer` | `influencer_deferrals` | |
| `Captacoes` | `captures` | |
| `Reservas_Midia_Movel` | `media_reservations` | |
| `Uso_Drone` | `drone_usages` | |
| `Cortes` | `clips` | |
| `Auditoria_Administrativa` | `audit_log` | |
| `Regras_Wiki` | `wiki_articles` | |
| `Sorteios_Premios` | `raffles` | |
| — | `session_tokens`, `trusted_devices` | Saem do `CacheService` e do `PropertiesService` |
| `Backup_*` (71) | — | Não migram |

## 9. Índices críticos

Estes índices substituem a varredura linear de `localizarCelulaDemanda_` e as releituras de abas inteiras:

- `demands`:
  - `(status)`;
  - `(editor_id, status)`;
  - `(influencer_id, status)`;
  - parcial da Fila de Fichas.
- `editing_cycles (demand_id) WHERE ended_at IS NULL`: único, e garante o invariante.
- `demand_pauses (demand_id) WHERE resumed_at IS NULL`: único, e garante o invariante.
- `deliveries (demand_id, version)`: único.
- `history (demand_id, created_at)`: detalhe da Demanda. A PK serve à revisão do polling.
- Índices parciais por prazo (`*_due_idx`): tornam baratos os crons de encerramento e de pendências.
- Restrições `EXCLUDE`: impedem sobreposição de Captação e Mídia Móvel mesmo com requisições concorrentes.

## 10. Regras para migrations

1. Só aditivas. `DROP`, `TRUNCATE`, troca de tipo ou remoção de valor de enum exigem PR próprio, aprovação explícita e plano de rollback.
2. Uma migration por PR temático, com nome sequencial.
3. Toda nova chave de Permissão entra no `CHECK` de `user_permissions` **e** em `lib/permissions.ts` no mesmo PR.
4. Seeds de dados reais nunca entram no repositório. O preview usa dados sintéticos.
