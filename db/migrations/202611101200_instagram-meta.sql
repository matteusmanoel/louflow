-- Instagram: um Business Manager por token, contas sincronizadas e publicação agendada.
-- O token fica cifrado. A Wiki wiki-08 guia a configuração do lado da Meta.

DO $$
DECLARE
  nome text;
BEGIN
  SELECT con.conname INTO nome
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE nsp.nspname = 'public'
     AND rel.relname = 'user_permissions'
     AND con.contype = 'c'
     AND pg_get_constraintdef(con.oid) ILIKE '%permission_key%';

  IF nome IS NOT NULL THEN
    EXECUTE format('ALTER TABLE user_permissions DROP CONSTRAINT %I', nome);
  END IF;
END $$;

ALTER TABLE user_permissions ADD CONSTRAINT user_permissions_permission_key_check
  CHECK (permission_key IN (
    'criarDemandas','definirOutroEditor','verTodasDemandas','editarDemandas',
    'atribuirEditor','alterarStatus','alterarPrioridade','excluirDemandas',
    'enviarFicha','verAgenda','gerenciarAgenda','verCaptacoes','gerenciarCaptacoes',
    'acessarCortes','verAbaCortes','verRelatorios','usarAnalista','gerenciarUsuarios',
    'verLixeira','verSorteios',
    'operarDrone','editorPadraoCortes','notaInformativaRanking',
    'conectarInstagram'
  ));

CREATE TABLE meta_portfolios (
  id                 text PRIMARY KEY,
  label              text NOT NULL CHECK (length(btrim(label)) BETWEEN 2 AND 80),
  meta_business_id   text,
  meta_user_name     text,
  token_ciphertext   bytea,
  token_iv           bytea,
  token_hint         text,
  token_version      integer NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'sem_token' CHECK (status IN ('sem_token','pendente','autenticada','erro')),
  last_error         text,
  last_sync_at       timestamptz,
  created_by         uuid NOT NULL REFERENCES users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (token_ciphertext IS NULL AND token_iv IS NULL AND status = 'sem_token')
    OR (token_ciphertext IS NOT NULL AND token_iv IS NOT NULL AND status <> 'sem_token')
  )
);
CREATE UNIQUE INDEX meta_portfolios_label_uq ON meta_portfolios (lower(label));

CREATE TABLE instagram_accounts (
  id             text PRIMARY KEY,
  portfolio_id   text NOT NULL REFERENCES meta_portfolios(id) ON DELETE CASCADE,
  ig_user_id     text NOT NULL,
  page_id        text NOT NULL,
  username       text NOT NULL,
  name           text,
  status         text NOT NULL DEFAULT 'pendente' CHECK (status IN ('ok','erro','ausente','pendente')),
  last_error     text,
  last_check_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, ig_user_id)
);
CREATE INDEX instagram_accounts_status_idx ON instagram_accounts (status);

ALTER TABLE post_schedules
  ADD COLUMN instagram_account_id text REFERENCES instagram_accounts(id) ON DELETE SET NULL,
  ADD COLUMN caption              text,
  ADD COLUMN media_url            text,
  ADD COLUMN media_kind           text CHECK (media_kind IN ('imagem','reel','story')),
  ADD COLUMN container_id         text,
  ADD COLUMN ig_media_id          text,
  ADD COLUMN publish_error        text,
  ADD COLUMN publish_attempts     integer NOT NULL DEFAULT 0,
  ADD COLUMN publish_claimed_at   timestamptz,
  ADD COLUMN published_at         timestamptz;

CREATE INDEX post_schedules_instagram_due_idx
  ON post_schedules (scheduled_at)
  WHERE status = 'Agendada' AND instagram_account_id IS NOT NULL;

INSERT INTO wiki_articles (id, category, title, summary, content, position, is_published, updated_by)
VALUES (
  'wiki-08',
  'Publicação',
  'Conectar o Instagram',
  'Um token por Business Manager, sincronizar e só agendar quando a conta estiver Ok.',
  $wiki08$O administrador conecta cada Instagram pelo LouFlow. Quem agenda não entra na Meta. Cada Business Manager tem o próprio token. Um token não enxerga as contas de outro.

Antes de abrir a tela, confirme com quem opera a infraestrutura duas coisas: a variável META_TOKEN_KEY está definida no ambiente (mínimo de 32 caracteres) e a rotina POST /api/cron/instagram roda a cada minuto, com o mesmo segredo das outras rotinas. Sem a rotina, o agendamento fica salvo e não sai no horário.

Do lado da Meta, uma vez por empresa:

1. O app é do tipo Business, com o produto Instagram, criado no portfólio da empresa. A verificação da empresa precisa estar concluída para o token sem prazo.
2. Cada Instagram é profissional (Business ou Creator) e está ligado a uma Página do Facebook. Página e Instagram ficam dentro do Business Manager daquela marca.
3. Se a Página exige autorização de publicação ou verificação em duas etapas, conclua isso antes. Sem isso a sincronização pode aceitar o token e a publicação falhar.

Em cada Business Manager:

1. Abra as configurações do negócio, Usuários, Usuários do sistema, e adicione um usuário do sistema com função de administrador.
2. Atribua a esse usuário o app, cada Página com controle total e cada Instagram com a tarefa de conteúdo.
3. Gere um token para o app, sem data de expiração, com as permissões instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement e business_management.
4. Copie o token na hora. A Meta não mostra de novo. Não cole o token na Wiki, em e-mail ou em comentário.

No LouFlow, em Administração, Instagram:

1. Cadastre um Business Manager com o nome que a equipe reconhece. Um registro por BM.
2. Cole o token e salve. O estado passa a Aguardando sincronização. O Ok anterior sai até a nova sincronização.
3. Sincronize. Token válido significa que a Meta aceitou a credencial. Ok em cada @ significa que a conta pode receber agendamento.
4. Agende título, conta, formato, marca, legenda, URL pública da mídia e horário de Brasília.

Formatos desta operação: foto (JPEG), Reel (MP4) e Story (JPEG ou MP4). A URL precisa abrir sem login. O LouFlow só envia o arquivo na hora marcada, porque o material preparado na Meta expira em 24 horas. Carrossel fica para uma etapa seguinte.

Se o token é válido e nenhuma conta aparece, o usuário do sistema não recebeu a Página, ou o Instagram não está ligado a ela. Se a conta fica Ausente depois de sincronizar, o ativo saiu do usuário do sistema. Gere outro token se a Meta recusar o atual e cole de novo.

A publicação sai em nome do Instagram profissional, não do usuário do LouFlow.$wiki08$,
  8,
  true,
  NULL
)
ON CONFLICT (id) DO NOTHING;
