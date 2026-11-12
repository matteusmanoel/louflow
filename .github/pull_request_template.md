## Contexto
<!-- Por que este PR existe. 1–3 frases. -->
- Task / User Story (opcional): AB#<taskId> · AB#<userStoryId>
- Fatia (AGENTS.md §1): S?-?? <nome>
- Link do plano/spec (se houver):

## Escopo
**Entra:**
-

**Não entra (propositalmente):**
-

Arquivos fora da pasta própria da fatia (justificar cada um):
- [ ] Nenhum
- [ ] Sim: `<arquivo>` — motivo

## Critérios de aceite
<!-- Copie os critérios da User Story. Cada um precisa de evidência. -->
- [ ] CA1 — evidência:
- [ ] CA2 — evidência:

## Como testar
1. `pnpm install --frozen-lockfile`
2. `pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev`
3. Passos manuais (perfil usado, rota, resultado esperado):

## Evidências
- [ ] `pnpm lint` · [ ] `pnpm typecheck` · [ ] `pnpm test:db` · [ ] `pnpm build` (cole o resumo)
- Prints/vídeo (tema claro e escuro; 650 px, se houver UI):
- Preview da pipeline:

## Zona de risco (docs/pr-review-guide.md §1)
- [ ] Zona do Osamah (UI/estilos/páginas sem `'use server'` nem `lib/db`)
- [ ] Requer revisão da TI (Server Action, rota `app/api/`, `lib/`, SQL novo)
- [ ] **Zona protegida** (`lib/**`, `db/migrations/**`, `proxy.ts`, `features/status|acesso/**`, `azure-pipelines.yml`, `package.json`, lockfile…) — justificativa:

## Migrações e dados
- [ ] Sem migration
- [ ] Migration nova **aditiva**: `db/migrations/AAAAMMDDHHMM_<taskId>_<slug>.sql` (nenhuma existente editada)
- [ ] Nova chave de Permissão (`CHECK` + `lib/permissions.ts` no mesmo PR)
- [ ] Sem dado real em seed/fixture/teste (só `@exemplo.test`)

## Riscos e rollback
- Risco principal:
- Como reverter (revert do PR / migration corretiva nova — migration aplicada nunca é editada):

## Checklist por área
**UI:** [ ] tokens, sem hex novo · [ ] claro/escuro · [ ] 650/390 px sem estouro · [ ] um `h1` · [ ] vocabulário do CONTEXT.md
**Backend/integrações:** [ ] `criarAcao` · [ ] Sessão→zod→Permissão→transação · [ ] `FOR UPDATE` + `registrarHistorico` · [ ] notificação após commit · [ ] cron idempotente
**Arquitetura/infra:** [ ] só a pasta da fatia · [ ] contratos de `lib/` respeitados · [ ] dependência nova justificada · [ ] pipeline verde
**Segurança:** [ ] Sessão/Permissão em toda ação · [ ] `/api/tv` com DTO · [ ] cron 401 sem `CRON_SECRET` · [ ] nenhum segredo/dado pessoal · [ ] sem `Co-authored-by`

## Revisores a acionar
- [ ] UI e acessibilidade
- [ ] Backend e integrações
- [ ] Arquitetura e infraestrutura
- [ ] Segurança (sempre)
- [ ] TI (obrigatório se zona protegida ou §1.2)

> Commits: `feat(<fatia>): descrição` + `AB#<taskId> AB#<userStoryId>` quando houver item no Azure Boards. Sem `Co-authored-by`. Repositório oficial: GitHub `matteusmanoel/louflow`, PR contra `develop`.
