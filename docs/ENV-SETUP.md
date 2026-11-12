# LouFlow — ambiente dos Cursor Cloud Agents

Documentação de referência: [Cloud Agent setup](https://cursor.com/docs/cloud-agent/setup) (schema: [environment.schema.json](https://cursor.com/schemas/environment.schema.json)).

## Arquivos versionados

| Arquivo | Papel |
|---|---|
| `.cursor/environment.json` | Config as code: imagem, `install`, `start`, porta 3000 |
| `.cursor/Dockerfile` | Ubuntu 24.04, Node 24, pnpm via corepack, Docker aninhado |
| `.cursor/start.sh` | Boot: Docker, Postgres local (só host/porta do compose), migrate, seed, PIN sintético, `next dev` em tmux `dev` |
| `.cursor/pin-sintetico.ts` | Define o PIN `482916` nos `@exemplo.test` sem PIN |
| `AGENTS.md` (§ Cursor Cloud) | Regras para o agente na VM |
| `.github/pull_request_template.md` | Template de PR no GitHub |

Ordem de resolução do Cursor: ambiente pessoal salvo → ambiente do time → `.cursor/environment.json` do repositório (só em execuções de um repositório). Um ambiente salvo só lê o arquivo se a localização do environment.json apontar para ele.

Depois do merge deste PR, no painel Cloud Agents → Environments, aponte a localização do environment.json para `.cursor/environment.json` (ou crie um ambiente novo com Config as code). O ambiente pessoal atual **não** passa a ler o arquivo sozinho.

## Stack

- **Node 24** (`engines` pede `>=22`). **pnpm 11.28.6** pinado na imagem (`npm install -g`, não `corepack enable` no `install`).
- `install` do ambiente: `pnpm install --frozen-lockfile` (como `ubuntu`). CI GitHub Actions **pendente**; o gate é o §5 do `AGENTS.md`.
- **Postgres 17 via Docker** (`docker-compose.yml`, porta **54329**, usuário/senha/banco `louflow`, dados em tmpfs). Docker aninhado usa `fuse-overlayfs` + `iptables-legacy`.
- `start.sh` sobe o daemon se preciso, cria `.env.local` sintético **só se faltar** (não sobrescreve um de desenvolvedor; pepper/cron/meta aleatórios por VM), recusa `DATABASE_URL` que não seja o compose local (`127.0.0.1`/`localhost`:54329), faz `unset` de `DATABASE_URL_UNPOOLED`, `DATABASE_URL_MIGRATE_*` e `SEED_ALLOW_REMOTE`, chama `validarDestinoSeed` antes do migrate, e espera o Next.js na porta 3000.
- O `next dev` usa `--hostname 0.0.0.0` porque o encaminhamento de porta do Cursor Cloud precisa bind em todas as interfaces; o acesso externo ainda depende do painel/auth do Cursor. O Postgres do compose publica só `127.0.0.1:54329` (sem `[::1]`, para o `db:up` não falhar em hosts sem IPv6). O Node 24 faz fallback de `localhost`/`::1` para IPv4.
- Testes: `pnpm test:db` recria `louflow_test` no mesmo Postgres. `tests/setup-env.ts` já fixa pepper, cron secret e chave Meta — **os testes não precisam de nenhum segredo**.
- E2E: não está no `pnpm check` nem no CI. Quando a fatia for S1-17, `pnpm exec playwright install --with-deps chromium` e, com o servidor do boot já em `:3000`, `E2E_BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test`. O Next 16 recusa um segundo `next dev` no mesmo `.next` (porta 3001 falha se `:3000` já estiver no ar).

## Segredos no painel do Cursor

**Nenhum segredo é obrigatório.** Tudo que o app precisa em nuvem é local e sintético (`.env.local` criado pelo `start.sh`).

| Nome | Cadastrar como secret? | Observação |
|---|---|---|
| `DATABASE_URL`, `DATABASE_URL_TEST` | **Não** | URLs do compose local |
| `PIN_PEPPER`, `CRON_SECRET`, `META_TOKEN_KEY` | **Não** | valores de teste gerados localmente; nunca usar os reais |
| `APP_URL` | Não | origem local na porta 3000; omitida no `.env.local` de nuvem |
| `UAZAPI_*` | **Não, nunca** | WhatsApp real do setor. Sem eles o aviso só é registrado |
| `AWS_*`, `S3_BUCKET` | **Não** | sem `S3_BUCKET` o Drive aceita só link externo |
| `VERCEL_*`, `DATABASE_URL_MIGRATE_*` | **Não, nunca** | deploy (Neon/Vercel). Agente de nuvem não deve ter acesso |

## Login sintético (UI na VM)

- E-mail: `admin@exemplo.test`
- PIN: `482916` (sintético; igual ao E2E). Sem `must_reset_pin` depois do `pin-sintetico.ts`.
- Perfil Prêmios: `premios@exemplo.test` / o mesmo PIN.

## Riscos

1. **Nunca apontar para Neon/Vercel/produção.** O `.env.local` de uma máquina local pode ter chaves reais; não copie nem cadastre como secret.
2. **Fonte de verdade no GitHub.** O repositório oficial é `matteusmanoel/louflow`. PRs dos agentes no GitHub contra `develop` são os definitivos. Ainda não há projeto nem repositório do LouFlow no Azure DevOps. `AB#` do Azure Boards é opcional.
3. **Zonas protegidas:** `AGENTS.md` §2 e `docs/pr-review-guide.md` §1.1 (inclui `.cursor/**`, `.github/**`, `docker-compose.yml`, `scripts/db/**`).
4. O `AGENTS.md` cita `/Users/matteusmanoel/Projects/Loumar/louflow/demandas-edits/` como legado somente local. O agente de nuvem **não terá** esse diretório; use o PRD.
5. Egress, se o time usar allowlist: `registry.npmjs.org`, `docker.io`, `registry-1.docker.io`, `auth.docker.io`, `production.cloudflare.docker.com`, `nodejs.org`, `download.docker.com`, `archive.ubuntu.com`, `security.ubuntu.com`, `github.com`, `cdn.playwright.dev` (E2E). A imagem `postgres:17-alpine` é puxada no boot frio (`pnpm db:up`), não no `install`. O Node da imagem vem do tarball em `nodejs.org/dist` (não de `deb.nodesource.com`).
