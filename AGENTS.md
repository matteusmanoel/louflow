# AGENTS.md — LouFlow

Regras para qualquer agente ou contribuidor que implemente uma fatia (User Story) do LouFlow.
Leia na ordem: [`CONTEXT.md`](CONTEXT.md) → seção do módulo em [`docs/prd-louflow.md`](docs/prd-louflow.md) →
[`docs/system-design.md`](docs/system-design.md) → tabelas em [`docs/schema-postgres.md`](docs/schema-postgres.md) →
[`docs/design-tokens.md`](docs/design-tokens.md) → [`docs/pr-review-guide.md`](docs/pr-review-guide.md).

## 1. Uma fatia, um dono

Cada fatia é dona **só** das pastas abaixo. Fora delas, apenas consumo dos contratos de `lib/`.
Se a fatia precisa mudar algo que não é seu, pare e reporte a dependência no PR.

| Fatia | User Story / Task | Pastas próprias |
|---|---|---|
| S1-01 Usuários e Permissões | #11556 / #11588 | `app/(app)/usuarios/`, `features/usuarios/` |
| S1-02 Demandas e Fila de Fichas | #11557 / #11589 | `app/(app)/demandas/`, `app/(app)/fichas/`, `features/demandas/` (exceto `secoes.ts`) |
| S1-03 Captações | #11558 / #11590 | `app/(app)/captacoes/`, `features/captacoes/` |
| S1-04 Mídia Móvel | #11559 / #11591 | `app/(app)/midia-movel/`, `features/midia-movel/` |
| S1-05 Uso de Drone | #11560 / #11592 | `app/(app)/drone/`, `features/drone/` |
| S1-06 Cortes | #11561 / #11593 | `app/(app)/cortes/`, `features/cortes/` |
| S1-07 Agenda de Postagem | #11562 / #11594 | `app/(app)/agenda/`, `features/agenda/` |
| S1-08 Notificações e Preferências | #11563 / #11595 | `app/(app)/preferencias/`, `features/notificacoes/` |
| S1-09 Painel de TV | #11564 / #11596 | `app/tv/`, `features/tv/` (o DTO em `lib/tv.ts` é protegido) |
| S1-10 Máquina de Status | #11565 / #11597 | `features/status/` — **zona protegida** |
| S1-11 Ficha Técnica | #11566 / #11598 | `app/(app)/ficha-tecnica/`, `features/fichas/` |
| S1-12 Comentários e Histórico | #11567 / #11599 | `features/comentarios/`, `features/historico/` |
| S1-13 Lixeira, Auditoria, Erros | #11568 / #11600 | `app/(app)/lixeira/`, `app/(app)/auditoria/`, `features/lixeira/`, `features/auditoria/`, `app/api/erros/` |
| S1-14 Entregas e Aprovações | #11569 / #11601 | `app/(app)/aprovacoes/`, `features/aprovacoes/` |
| S1-15 Lote e Desligamento | #11570 / #11602 | `features/lote/` |
| S1-16 Pendências do Influencer | #11571 / #11603 | `app/(app)/pendencias/`, `features/pendencias/` |
| S1-17 E2E e regressão | #11572 / #11604 | `e2e/`, `playwright.config.ts` |

Componentes compartilhados novos em `components/ui/` são permitidos se forem **aditivos** (novo arquivo ou novo export), sem mudar a API dos existentes.

## 2. Zona protegida

Alterar exige justificativa no PR e revisão explícita (ver `docs/pr-review-guide.md` §1.1):
`lib/**`, `db/migrations/**` (só arquivos novos), `db/runner.ts`, `proxy.ts`, `features/acesso/**`,
`features/status/**` (dona: S1-10), `features/demandas/secoes.ts`, `app/api/{tv,cron,sync,sessao}/**`,
`app/(app)/layout.tsx`, `app/layout.tsx`, `next.config.ts`, `azure-pipelines.yml`, `package.json`, `pnpm-lock.yaml`,
`eslint.config.mjs`, `tsconfig.json`, `vitest.config.mts`.

Dependência nova em `package.json` só com justificativa de uma linha no PR.

## 3. Contratos prontos (use, não recrie)

- **Server Action:** sempre `criarAcao({ nome, schema, permissao, restricoes, executar })` de `lib/action.ts`, em `features/<fatia>/actions.ts` com `'use server'`. Ordem fixa: Sessão → zod → Permissão → transação → domínio → commit → notificações. Retorno `{ ok, mensagem, dados }`. Regra de negócio violada = `throw new ErroDominio('mensagem amigável')`.
- **Páginas:** `await exigirModulo('<slug>')` de `lib/auth.ts` no topo; leituras em `features/<fatia>/consultas.ts`. Página e componente **nunca** importam `@/lib/db` (o lint bloqueia).
- **Histórico:** toda mutação de Demanda chama `registrarHistorico(tx, …)` na mesma transação (é a revisão do `/api/sync`). Mutação de Demanda abre com `SELECT … FOR UPDATE` na linha.
- **Status:** só `features/status/` faz `UPDATE demands SET status`. As outras fatias chamam a função exportada por S1-10.
- **Auditoria:** ações administrativas chamam `registrarAuditoria(tx, …)` (sanitiza campos sensíveis).
- **Notificação:** dentro da ação, `ctx.notificar({ tipo, destinatarios, assunto, texto })`. O envio ocorre depois do commit; falha nunca desfaz a operação. O adaptador real é de S1-08 em `features/notificacoes/enviador.ts`.
- **Cron:** o handler vive em `features/<fatia>/jobs.ts` com a assinatura `HandlerJob` já registrada em `lib/cron.ts`. Tem de ser idempotente. Não renomeie o export.
- **TV:** S1-09 preenche `features/tv/consultas.ts` (`carregarDadosTv`). Campo novo no payload exige mudar `lib/tv.ts` (protegido).
- **Seções do detalhe da Demanda:** `features/demandas/secoes.ts` fixa `PropsSecaoDemanda = { demandaId, usuario }`. Cada fatia dona substitui o corpo do seu componente reservado sem mudar o nome nem as props: `FichaSecao` (S1-11), `StatusControle` (S1-10), `EntregasSecao` (S1-14), `ComentariosSecao` e `HistoricoSecao` (S1-12). S1-02 compõe o detalhe com eles.
- **Desligamento:** S1-01 chama `desligarUsuario` de `features/lote/actions.ts`; S1-15 implementa o corpo sem mudar a assinatura.
- **Restrições do banco:** sobreposição de Captação e de Reserva vem do `EXCLUDE`; traduza via `restricoes` (`captures_videomaker_id_tstzrange_excl`, `media_reservations_tstzrange_excl`), nunca com varredura prévia.
- **UI:** tokens de `app/globals.css` e componentes de `components/ui`; sem hex solto novo; temas claro e escuro; layout aguenta 650 px.

## 4. Migrations

- Nunca edite migration existente (o runner recusa checksum alterado).
- Arquivo novo: `db/migrations/AAAAMMDDHHMM_<taskId>_<slug>.sql` (ex.: `202611051030_11590_captacoes-indices.sql`). Só aditivo.
- Nova chave de Permissão: `CHECK` de `user_permissions` (migration nova) + `lib/permissions.ts` no mesmo PR.

## 5. Quality gate (todos obrigatórios antes do PR)

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:db      # sobe o Postgres de teste (docker) e roda vitest
pnpm build
```

Testes cobrem o comportamento público da fatia (Server Actions e consultas contra o Postgres de teste, usando `tests/helpers/db.ts`), incluindo os casos negativos de Permissão. Cada critério de aceite da User Story precisa de evidência: teste automatizado ou passo verificável descrito no PR.

## 6. Fluxo de Git e PR

1. Parta de `develop` atualizado: `git switch develop && git pull && git switch -c feature/<taskId>-<slug>`.
2. Trabalhe em worktree próprio quando houver agentes em paralelo (`git worktree add ../louflow-<taskId> -b feature/<taskId>-<slug> develop`).
3. Commits: `feat(<fatia>): descrição` + corpo curto + `AB#<taskId> AB#<userStoryId>`. **Proibido** qualquer trailer `Co-authored-by`.
4. PR para `develop` no repositório `louflow` (projeto ADO `louflow-marketing`), título `feat(<fatia>): <descrição>`, descrição com `AB#<id>`, resumo, checklist dos critérios de aceite com a evidência de cada um, e arquivos fora da pasta própria (se houver) justificados.
5. Antes do PR: `git fetch && git rebase origin/develop` e o gate de novo.
6. `main` só recebe merge com aprovação humana.

## 7. Segurança e dados

- Nenhum segredo, connection string, token ou `.env` real no repositório, em log, em PR ou em comentário.
- Seeds, fixtures, testes e previews usam só dados sintéticos (`@exemplo.test`). Nenhum nome, e-mail, link de Drive ou conteúdo de Demanda real.
- Nada de dado pessoal em `error_log` ou mensagem de erro (`registrarErro` já sanitiza; não contorne).
- Sem nomes próprios em regra de código: o que o legado amarrava a uma pessoa é Permissão.
- Perfil Prêmios só alcança Sorteios; rota nova declara o escopo em `lib/modules.ts` (protegido) via PR da fatia, com justificativa.

## 8. Referência do legado

O sistema antigo (Apps Script) fica **fora do repositório**, apenas na máquina local, somente leitura:
`/Users/matteusmanoel/Projects/Loumar/louflow/demandas-edits/` (código `.js`/`.html`).
Use para conferir regras de negócio. Nunca copie dados, nunca faça commit desse diretório nem de planilhas (`*.xlsx`), e nunca reproduza nomes de pessoas no código. Se o legado conflitar com o PRD, o PRD vence.

## Cursor Cloud specific instructions

- Node 22+ e pnpm `11.28.6` (`packageManager`). Instale com `corepack enable && corepack install && pnpm install --frozen-lockfile`.
- O Postgres local é o `docker-compose.yml`: porta `54329`, usuário, senha e banco `louflow`, dados em tmpfs (container novo começa vazio). Neste ambiente o daemon usa `fuse-overlayfs` e o backend `iptables-legacy`; é o que faz o handshake TCP em `localhost:54329` completar.
- No boot, o `start` do Cloud Agent sobe o Docker, o Postgres, `pnpm db:migrate`, `pnpm db:seed` e `next dev` em `http://localhost:3000`. `.env.local` é criado se faltar, com as URLs do compose e o `PIN_PEPPER` já usado em `tests/setup-env.ts`.
- Usuários sintéticos `@exemplo.test`. Enquanto `pin_hash` estiver vazio, o start grava o PIN de desenvolvimento `482916` (o mesmo tipo de credencial local que a senha `louflow` do compose; não é segredo de produção). O Administrador entra em `/demandas`.
- Qualidade: `pnpm lint`, `pnpm typecheck`, `pnpm test:db` (recria `louflow_test`), `pnpm build`. `pnpm dev` é o servidor de desenvolvimento.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
