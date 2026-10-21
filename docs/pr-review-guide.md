# Guia de Revisão de PR — LouFlow

> Para o agente revisor e para contribuidores sem perfil de TI, como o Osamah. Define **o que cada PR pode tocar, quem aprova e o que bloqueia o merge**. A definição de "protegido" vem de D7 (confirmada em P5). Referências: [`system-design.md`](system-design.md), [`schema-postgres.md`](schema-postgres.md), [`prd-louflow.md`](prd-louflow.md), [`../CONTEXT.md`](../CONTEXT.md).

## 1. Três zonas

O revisor classifica **cada arquivo** do diff. O PR herda a zona **mais restrita** entre todos os arquivos.

### 1.1 Zona protegida: bloquear e escalar para a TI

Mudanças aqui só passam com aprovação explícita da TI. O revisor **não aprova** e marca o PR como `Waiting for author`, citando o arquivo e a regra.

| Caminho | Por quê |
|---|---|
| `lib/auth.ts`, `lib/session.ts`, `lib/pin.ts`, `lib/crypto.ts`, `features/acesso/`, `proxy.ts`, `app/api/sessao/` | PIN, Sessão, Dispositivo Confiável, bloqueio de login |
| `lib/permissions.ts`, `lib/modules.ts` | Chaves de Permissão, padrões por Perfil e menu por Permissão |
| `lib/action.ts`, `lib/cron.ts`, `lib/tv.ts`, `lib/notify.ts`, `lib/history.ts`, `lib/audit.ts`, `lib/db.ts` | Contratos compartilhados: Server Action, jobs, DTO da TV, notificação, Histórico, Auditoria |
| `features/status/` | Máquina de Status, Ciclo de Edição, Pausa, reconciliação de Entregas |
| `db/migrations/`, `db/runner.ts` | Schema compartilhado; só aditivo |
| `app/api/tv/` | Payload público, sem login |
| `app/api/cron/` | Autenticação por segredo e idempotência |
| `app/api/sync/` | Contrato da revisão usada no polling |
| `scripts/migracao/` | Importação de dados reais |
| `azure-pipelines.yml`, `vercel.json`, `next.config.*`, `proxy.ts` | Deploy, cabeçalhos e roteamento de acesso |
| `package.json`, lockfile | Dependências novas |

### 1.2 Requer revisão da TI

O revisor pode comentar e sugerir, mas o merge espera a TI.

- Qualquer Server Action nova ou alterada em `features/*/actions.ts`.
- Qualquer rota nova em `app/api/`.
- Qualquer mudança em `lib/`.
- Qualquer query SQL nova, inclusive dentro de componentes. Isso já é uma violação: componente não acessa o banco.
- Mudança em texto de e-mail que altere quem recebe ou quando recebe.

### 1.3 Zona do Osamah: merge após revisão leve

O revisor pode aprovar sozinho se todos os itens da §3 passarem.

- `app/(app)/**/page.tsx` e `layout.tsx`, **desde que** não declarem `'use server'` nem importem `lib/db`.
- `components/**`: UI, estados visuais, textos de tela.
- Estilos: `app/globals.css`, `*.module.css`, tokens que já existem em [`design-tokens.md`](design-tokens.md).
- `public/**`: imagens e ícones (sem dados pessoais).
- Textos da Wiki semeados em arquivo, se houver.

## 2. Invariantes: qualquer violação bloqueia, em qualquer zona

### 2.1 Domínio

1. **Sem nomes próprios no código.** Nenhuma regra pode depender do nome de uma pessoa. O que hoje é amarrado a nome vira Permissão em `user_permissions` (D9).
2. **Toda mutação de Demanda** acontece numa transação com `SELECT … FOR UPDATE` na linha afetada e grava `history` na mesma transação. Sem a linha no Histórico, os outros usuários não veem a mudança (`/api/sync`).
3. **Transições de Status só em `features/status/`.** Nenhum outro arquivo faz `UPDATE demands SET status`.
4. **Um Ciclo aberto e uma Pausa aberta por Demanda, no máximo.** O banco garante isso; o código não pode contornar com `DELETE` e reinserção.
5. **Mídia Móvel e Captação não se sobrepõem.** As restrições `EXCLUDE` são a fonte da verdade, e o código só traduz o erro do banco numa mensagem amigável.
6. **E-mail só depois do commit.** Falha de envio não desfaz a operação.
7. **Valores canônicos.** Status, Prioridade e Situação usam exatamente os rótulos do schema e do [`CONTEXT.md`](../CONTEXT.md). Sinônimos novos são proibidos.

### 2.2 Acesso e segurança

8. **Toda Server Action valida a Sessão antes de qualquer outra lógica**, e depois checa a Permissão. A Sessão vem do cookie e nunca de um argumento.
9. **`/api/tv` usa DTO com lista explícita de campos.** Proibido serializar a linha inteira (`SELECT *`, spread de objeto do banco). Nunca expõe e-mail, PIN, Sessão, Ficha Técnica, motivo de Adiamento, link de material nem ganhador de Sorteio.
10. **Rotas de cron** respondem 401 sem `Authorization: Bearer $CRON_SECRET` e são idempotentes.
11. **Nenhum segredo no repositório.** Isso vale para chaves, URL do banco, pepper, tokens e arquivos `.env*` (exceto `.env.example` sem valores). Segredo encontrado no diff bloqueia o PR e exige rotação.
12. **Nada de dado pessoal em log, `error_log` ou mensagem de erro.** PIN, token, e-mail completo e payload de formulário ficam fora.
13. **Perfil Prêmios só alcança Sorteios.** Rota nova precisa declarar o escopo permitido.

### 2.3 Dados

14. **Migrations aditivas.** `DROP`, `TRUNCATE`, troca de tipo, remoção de valor de enum ou `NOT NULL` sem default em tabela populada exigem PR dedicado, plano de rollback e aprovação explícita.
15. **Migration aplicada nunca é editada.** Correção vira uma nova migration.
16. **Nova chave de Permissão** entra no `CHECK` de `user_permissions` e em `lib/permissions.ts` no mesmo PR.
17. **Nenhum dado real em seed, fixture, teste ou preview.** Use dados sintéticos.

### 2.4 Repositório

18. Commit com `AB#<id>` do Work Item. **Sem `Co-authored-by`** de ferramentas ou agentes.
19. O PR não mistura zonas sem necessidade. UI e Server Action nova vão em PRs separados quando possível.
20. Lint, typecheck e testes verdes na Pipeline. Preview gerado.

## 3. Checklist do revisor

Antes de aprovar um PR da zona do Osamah, o revisor confirma:

- [ ] Todos os arquivos do diff estão na §1.3.
- [ ] Nenhum `'use server'`, `import … from '@/lib/db'`, `fetch` para `/api/cron` nem SQL no diff.
- [ ] Cores, raios e sombras usam tokens existentes, sem hex solto novo.
- [ ] Textos de tela usam os termos do [`CONTEXT.md`](../CONTEXT.md). Por exemplo, "Demanda" e não "tarefa"; "Entrega" e não "upload".
- [ ] Nenhum nome de pessoa, e-mail ou link de Drive real em texto, mock ou imagem.
- [ ] O preview abre, a tela alterada funciona nos temas claro e escuro, e o layout aguenta 650 px de largura.
- [ ] O Painel de TV, se tocado, continua legível em tela grande, com tipografia em `clamp()`.

Para PRs das zonas §1.1 e §1.2, o revisor também verifica as invariantes §2.1 a §2.3 linha a linha e lista no comentário quais conferiu.

## 4. Como o revisor responde

| Resultado | Ação |
|---|---|
| Zona do Osamah + checklist ok | Aprovar, com um resumo de uma linha |
| Zona da TI ou protegida | Comentar os achados, **não** aprovar, marcar a TI |
| Invariante violada | `Waiting for author`, citando o número da invariante, o arquivo e a linha |
| Dúvida de produto (regra nova, mudança de comportamento) | Não decidir. Perguntar no PR e apontar a seção do PRD |

Comentários são objetivos e citam arquivo e linha. O revisor não reescreve o PR: aponta o problema e, quando for simples, sugere a correção.
