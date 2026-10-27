# Auditoria de UI — LouFlow

**Data:** 22/10/2026 · **Ambiente:** `localhost:3001` (Next.js 16 dev, Turbopack) com seed sintético (`pnpm db:seed --pin`).
**Perfis usados:** `admin@exemplo.test`, `influencer@exemplo.test` e `premios@exemplo.test`.
**Viewports:** 1440 px (desktop), 980 px (limite do shell), 650 px (mínimo do produto) e 390 px (mobile).
**Temas:** escuro (padrão), claro e o menu Claro/Escuro/Sistema.
**Prints:** `docs/agents/ui-audit/prints/` (nome `<rota>-<largura>-<tema>[-estado].png`).

Escopo: só diagnóstico. Nenhuma tela foi refatorada; rotas, regras, permissões e dados não foram alterados.
Os únicos dados gravados vieram do seed e das trocas de PIN obrigatórias dos usuários sintéticos.
A única exceção de código é a base de gráficos em `components/charts/` (ver [§9](#9-base-de-gráficos-echarts)).

Prioridade: **P0** bloqueia o uso ou esconde uma ação · **P1** quebra o padrão, o layout ou a acessibilidade · **P2** é inconsistência visual ou de texto.

---

## 1. Inventário

### 1.1 Telas auditadas

| Rota | Perfil | Prints |
|---|---|---|
| `/login`, `/trocar-pin` | — | `login-1440-escuro`, `trocar-pin-1440-escuro` |
| `/demandas` | Admin | `demandas-1440-escuro`, `-filtro-ativo`, `-menu-tema`, `demandas-1440-claro`, `demandas-1440-claro-menu-recolhido`, `demandas-980-claro`, `demandas-390-claro`, `demandas-390-claro-menu-mobile` |
| `/demandas` | Influencer | `demandas-1440-escuro-influencer`, `demandas-1440-escuro-influencer-sem-permissao` (acesso direto a `/usuarios`) |
| `/demandas/nova` | Admin | `demandas-nova-1440-escuro` |
| `/demandas/[id]` | Admin | `demanda-detalhe-1440-escuro` (LFseed000003, página inteira) |
| `/demandas/[id]/editar` | Admin | `demanda-editar-1440-escuro` |
| `/fichas` | Admin | `fichas-1440-escuro` |
| `/ficha-tecnica` | Admin | `ficha-tecnica-1440-escuro` |
| `/aprovacoes` | Admin | `aprovacoes-1440-escuro` |
| `/cortes` | Admin | `cortes-1440-escuro` |
| `/pendencias` | Admin | `pendencias-1440-escuro-vazio`, `pendencias-390-claro-zoom` |
| `/pendencias` | Influencer | `pendencias-1440-escuro-influencer`, `pendencias-1440-escuro-influencer-adiamento` |
| `/agenda` | Admin | `agenda-1440-escuro`, `agenda-390-claro` |
| `/captacoes` | Admin | `captacoes-1440-escuro`, `captacoes-650-claro` |
| `/captacoes/nova`, `/captacoes/[id]` | Admin | `captacoes-nova-1440-escuro`, `captacao-editar-1440-escuro` |
| `/midia-movel` | Admin | `midia-movel-1440-escuro` |
| `/drone` | Admin | `drone-1440-escuro`, `drone-1440-escuro-alertdialog`, `drone-390-claro-estouro` |
| `/drone/novo`, `/drone/[id]/editar` | Admin | `drone-novo-1440-escuro`, `drone-editar-1440-escuro` |
| `/usuarios` | Admin | `usuarios-1440-escuro`, `usuarios-1440-claro`, `usuarios-650-claro-estouro` |
| `/usuarios/novo` | Admin | `usuarios-novo-1440-escuro`, `usuarios-novo-1440-escuro-select-aberto` |
| `/usuarios/[id]` | Admin | `usuario-detalhe-1440-escuro` |
| `/lixeira`, `/auditoria`, `/preferencias` | Admin | `lixeira-1440-escuro`, `auditoria-1440-escuro`, `preferencias-1440-escuro` |
| Módulos reservados: `/equipamentos`, `/dashboard`, `/relatorio`, `/ranking`, `/analista`, `/wiki`, `/sorteios` | Admin | `<rota>-1440-escuro-reservado` |
| `/sorteios` | Prêmios | `sorteios-1440-escuro-premios`, `sorteios-390-escuro-premios` |

Larguras medidas por `document.documentElement.scrollWidth` (sem print para todas):

| Rota | 650 px | 390 px (mobile) |
|---|---|---|
| `/demandas` | 650 ✓ | 390 ✓ |
| `/agenda` | — | 390 ✓ |
| `/usuarios` | **737** | **737** |
| `/auditoria` | — | **932** |
| `/cortes` | — | **885** |
| `/drone` | — | **904** |
| `/pendencias` | — | **664** (`min-w-[650px]`) |

### 1.2 Bloqueios e telas não auditadas

| Item | Motivo |
|---|---|
| `/tv` | Fora do escopo do padrão de UI (identidade própria, `app/tv/tv.css`). Não visitada. |
| Perfil **Editor** | Não entrou na amostra combinada (Admin + Influencer + Prêmios). A visão do Editor foi inferida de `lib/modules.ts`, não visualizada. |
| Modal de PIN provisório (`/usuarios/[id]` → Redefinir PIN) | Não aberto: geraria um PIN real e mudaria o estado do usuário. |
| Confirmações destrutivas da Lixeira, Cortes e Captação | Só o `AlertDialog` do Drone foi aberto e fechado com "Voltar". Os demais foram identificados pelo snapshot de acessibilidade, sem abrir. |
| Tema **Sistema** | O menu com a opção foi capturado; a troca do tema do SO não foi emulada. |
| Mobile e 650 px | Nem todas as rotas foram capturadas nessas larguras; as não capturadas foram medidas na tabela acima ou ficaram de fora. |

---

## 2. Achados ordenados por impacto

### P0

| # | Problema | Onde | Print | Impacto | Recomendação |
|---|---|---|---|---|---|
| 1 | **CTAs invisíveis.** `Button asChild` + `Link` fica com o texto da mesma cor do fundo (rgb 8,117,168). A regra sem camada `a { color: var(--loumar-700) }` (`app/globals.css:246`) vence os utilitários do Tailwind, que ficam em `@layer`. | Nova demanda (×2), Nova captação, Registrar uso, Novo usuário | `demandas-1440-*`, `usuarios-1440-claro`, `demandas-390-claro` | O usuário não lê a ação principal da tela, em qualquer tema e largura. | Mover os estilos base de elementos de `globals.css` para `@layer base`. É uma regra global ([§3](#3-problemas-recorrentes--regras-globais)). |
| 2 | **Página inteira estoura a largura** a partir de 650 px. `.conteudo-shell` é um grid sem `grid-template-columns: minmax(0, 1fr)`. As páginas abrem outro `<main>` (item 4), e a tabela larga empurra o grid. No mobile o navegador reduz a página toda (zoom-out). | Usuários, Auditoria, Cortes, Drone, Lixeira (provável) | `usuarios-650-claro-estouro`, `drone-390-claro-estouro` | Contraria o requisito "aguenta 650 px"; ação e colunas ficam fora da tela. | Shell: `grid-template-columns: minmax(0,1fr)`. A tabela rola dentro do próprio wrapper. |
| 3 | **`min-w-[650px]` na página.** | `/pendencias` | `pendencias-390-claro-zoom` | No celular, a tela do Influencer (o público principal dela) aparece reduzida. | Remover o `min-w` de página. Os 650 px são o mínimo **suportado**, não uma largura forçada. |

### P1

| # | Problema | Onde | Print | Impacto | Recomendação |
|---|---|---|---|---|---|
| 4 | **`<main>` aninhado** em cerca de 20 páginas, cada uma com padding e max-width próprios (`p-6`, `p-[var(--conteudo-padding)]`, `max-w-2xl`, `max-w-4xl mx-auto`, `style={{padding}}`, nenhum). O padding sai duplicado e há dois landmarks `main`. | `app/(app)/**/page.tsx` | todos os desktop | Cada tela tem uma largura e um alinhamento: Demandas e Usuários usam largura total; Captações cerca de 800 px centralizado; Mídia Móvel uma coluna de cerca de 380 px; o detalhe e os formulários usam `max-w-2xl` alinhado à esquerda; Preferências e Nova Captação ficam centralizadas. | Um `PageContainer` com 2 larguras nomeadas (ver [§6](#6-critérios-de-escolha)). As páginas renderizam `<>…</>` ou `<section>`. |
| 5 | **Tokens sem variante escura.** `--chip-*`, `--prioridade-*`, `--linha-atrasada-*` e `--linha-prazo-*` só existem em `:root`. | Cards atrasados (rosa-claro no escuro), badges "Não iniciada", "Cancelada" e "Concluída" (pílula branca), prioridades | `demandas-1440-escuro`, `demandas-1440-escuro-menu-tema` | Contraste ruim e quebra visual do tema padrão. | Sobrescrever esses tokens em `[data-tema='escuro']`. O `ui-standards §2.2` dizia que não era preciso; essa afirmação foi corrigida. |
| 6 | **`--destructive` no escuro** vira `#ff8a80` com `--destructive-foreground: #ffffff`. | Botões destrutivos sólidos no escuro | `drone-1440-escuro-alertdialog` | Contraste aproximado de 2:1, abaixo do AA. | Token próprio `--destructive-foreground` escuro (texto escuro) ou fundo destrutivo mais fechado no escuro. |
| 7 | **Token inexistente `--loumar-400`** usado em `hover:border-[var(--loumar-400)]`. | Preferências, Agenda | `preferencias-1440-escuro` | O hover não tem efeito (a variável não resolve). | Usar `--loumar-600` ou criar o token (decisão de design). |
| 8 | **Ações de linha como links de texto** ("Editar", "Cancelar", "Excluir", "Restaurar") e coluna não fixa. | Captações, Drone, Usuários, Lixeira, Cortes, comentários | `drone-1440-escuro`, `usuarios-1440-*`, `lixeira-1440-escuro` | Fica ambíguo ("Cancelar" pode ser descartar ou destruir); a coluna some no estouro (item 2). | Coluna de ações `sticky right-0` com `DropdownMenu` (kebab); ação primária no clique da linha. |
| 9 | **"Limpar" condicional muda o layout.** O botão aparece entre Filtrar e Nova demanda e encolhe a busca. "Nova demanda" também aparece duplicada (cabeçalho e barra). | `/demandas` | `demandas-1440-escuro`, `-filtro-ativo` | Os controles saltam ao filtrar; a ação primária é repetida. | Reservar o espaço (botão sempre presente e `disabled` sem filtro) ou movê-lo para fora da linha. A ação primária só no cabeçalho. |
| 10 | **`SelectItem value=""`** (Radix proíbe valor vazio). | `QuadroDemandas`, `FormDemanda` (3×) | — | Erro em runtime do Radix; opção "Todos"/"Nenhum" não selecionável de forma confiável. | Sentinela (`"todos"`, `"nenhum"`) mapeada para vazio na submissão. |
| 11 | **Ordem do rodapé de formulário inconsistente.** Captação: Voltar \| Primária. Drone e Demanda: Primária \| Cancelar. Usuário novo: só a primária. AlertDialog: Voltar \| Confirmar. | Formulários | `captacoes-nova-*`, `drone-novo-*`, `usuarios-novo-*`, `demanda-editar-*` | A memória muscular falha; aumenta a chance de clicar errado. | Uma regra só: secundária à esquerda, primária à direita, alinhadas à direita; destrutiva isolada à esquerda. |
| 12 | **Hidratação apaga `data-tema`.** O `useState` de `AlternarTema` lê `localStorage` no init (SSR renderiza "Escuro", o cliente "Claro"), e há outros erros de hidratação em `MenuLateral`. Com `louFlowTema=claro`, o `<html>` ficou **sem** `data-tema` após hidratar. Com `escuro` salvo, Pendências renderizou clara. | Shell | `pendencias-1440-escuro-influencer` (deveria ser escuro) | Tema errado ou piscando. **Parcialmente hipótese:** parte dos erros vem dos atributos `data-cursor-ref` da automação. | Ler o tema em `useEffect` (ou `useSyncExternalStore`) e não no init do estado; validar sem automação. |
| 13 | **Shell mobile até 980 px.** Em 980 px (tablet e janela dividida) já aparecem hambúrguer + bottom bar. | Shell | `demandas-980-claro` | Desperdiça a sidebar em telas médias. | Manter 980 px como contrato documentado (o código usa 980) ou baixar para 768 px — **decisão pendente**. |
| 14 | **Bottom bar = os 4 primeiros itens do menu** (`itens.slice(0, 4)`), não a prioridade documentada. O Admin ganha "Fila de Fichas" e "Enviar Ficha Técnica"; rótulos truncados ("Enviar Ficha Técn…"). O Prêmios tem 1 item na barra e o mesmo no hambúrguer. | `BottomBar.tsx` | `demandas-390-claro`, `sorteios-390-escuro-premios` | Atalhos irrelevantes; navegação redundante. | Aplicar a ordem de prioridade do `ui-standards §7.2` com rótulos curtos; esconder a barra e o hambúrguer quando há ≤ 1 destino. |
| 15 | **Página sem `h1`.** Preferências usa `h3`; os módulos reservados e Sorteios usam `h2`. | Preferências, reservados | `preferencias-1440-escuro`, `*-reservado` | Hierarquia de títulos quebrada para leitores de tela. | Todo destino tem exatamente um `h1` via cabeçalho de página. |
| 16 | **Aprovações sem estrutura:** sem cabeçalho de página nem container; texto colado ("Editor ExemploVer arquivo"). | `/aprovacoes` | `aprovacoes-1440-escuro` | Ilegível. | Cabeçalho de página + lista em cards (ver [§5](#5-recomendações-pontuais-não-generalizar)). |
| 17 | **"Perfil atendido" vazio ao editar.** As opções são perfis de acesso (Administrador/Editor/Influencer/Prêmios), mas os registros guardam perfis de marca ("Loumar", "ClickFoz"). | `/drone/[id]/editar` | `drone-editar-1440-escuro` | O valor salvo não aparece; risco de sobrescrever. **Regra de domínio, fora do escopo de UI.** | Reportar à fatia S1-05: definir a lista oficial de perfis atendidos. |

### P2

| # | Problema | Onde | Print |
|---|---|---|---|
| 18 | IDs internos de tarefa visíveis ao usuário ("Módulo em construção (S2-02 #11574)"). | Reservados | `*-reservado` |
| 19 | Auditoria mostra slugs crus (`conceder_permissao`, `mover_lixeira`) ao lado de rótulos amigáveis, e UUID como alvo; detalhes truncados sem tooltip. | `/auditoria` | `auditoria-1440-escuro` |
| 20 | Datas ISO (`2026-10-25`) em Cortes contra `dd/MM/yyyy` no resto. | `/cortes` | `cortes-1440-escuro` |
| 21 | Card dentro de card (tabela de Cortes; tabela do Drone dentro de painel com cabeçalho vazio). | Cortes, Drone | `cortes-1440-escuro`, `drone-1440-escuro` |
| 22 | Rótulos divergentes: "Enviar Ficha Técnica" (menu) contra "Ficha Técnica" (título); "Premios" sem acento na tabela e no Select de Usuários contra "PRÊMIOS" no topo. | Menu, Usuários | `usuarios-1440-claro`, `usuarios-novo-1440-escuro-select-aberto` |
| 23 | Situação como texto colorido ("Ativo", "PIN pendente") em vez de `Badge`; o status da Lixeira em texto puro. | Usuários, Lixeira | `usuarios-1440-*`, `lixeira-1440-escuro` |
| 24 | Pluralização: `aria-label` "2 postagems". | Agenda | — |
| 25 | `StatusControle` com rótulos colados ("ConcluídaAjustes solicitadosEm execução…"). | Detalhe da Demanda | `demanda-detalhe-1440-escuro` |
| 26 | "Cancelar adiamento" é o rótulo do toggle que **fecha** o formulário (soa como desfazer um adiamento). | Pendências (Influencer) | `pendencias-1440-escuro-influencer-adiamento` |
| 27 | Emoji em conteúdo de UI (`⚠️ Demanda atrasada`). | Detalhe da Demanda | `demanda-detalhe-1440-escuro` |
| 28 | Rótulo do botão de recolher pode não refletir o estado persistido (o estado inicial é sempre `false`). | `MenuLateral.tsx` | — |
| 29 | Inline styles de layout remanescentes: `demandas/[id]/page.tsx` (16), `MenuMobile`, `FichaSecao`, `FormFichaTecnica`, `CalendarioAgenda`, `TabelaDrone`, `preferencias`, `loading.tsx` (2 rotas). | código | — |
| 30 | Marca d'água LOUMAR do login com baixo contraste no escuro. | `/login` | `login-1440-escuro` |

### Pontos positivos (manter)

- `AlertDialog` do Drone tem título e descrição claros, e foca "Voltar".
- `EstadoVazio` em Pendências; filtros de Demandas funcionam e refletem na URL.
- Menu recolhido com ícones Lucide e tooltip; o menu do tema (Claro/Escuro/Sistema) funciona.
- Permissões: acesso direto a uma rota não permitida redireciona com aviso (`?aviso=sem-permissao`) — confirmado com Influencer → `/usuarios` e Prêmios → `/demandas`.
- Sem `window.confirm`/`alert`, sem rgba ou hex soltos em `.tsx` fora de `app/tv/`.

---

## 3. Problemas recorrentes → regras globais

Registradas em `docs/agents/ui-standards.md` (seção indicada):

1. **Estilos base de elementos em `@layer base`** (§2.1). Regra sem camada vence qualquer utilitário Tailwind (achado 1).
2. **Página não abre `<main>`** e não define padding nem max-width próprios; usa o container de página (§5.3, achado 4).
3. **Grid e flex que contêm tabelas usam `minmax(0,1fr)` / `min-w-0`**; nenhuma página usa `min-w-[…]` (§16.3, achados 2 e 3).
4. **Todo token semântico de cor tem valor no escuro** (§3.3, achados 5 e 6).
5. **Só tokens existentes**; `var(--x)` inexistente é bug (§3, achado 7).
6. **Ações de linha em `DropdownMenu`**, coluna sticky (§10.2, achado 8).
7. **Controles de filtro não mudam o layout** ao ativar (§10.3, achado 9).
8. **`SelectItem` nunca com `value=""`** (§9.2, achado 10).
9. **Rodapé de ações único** para formulário, Dialog e AlertDialog (§9.1 e §13, achado 11).
10. **Estado lido do `localStorage` não entra no render inicial** (§4.2, achado 12).
11. **Exatamente um `h1` por destino** (§15.4, achado 15).
12. **Datas `dd/MM/yyyy`** e rótulos de domínio vindos de uma fonte única (§9.5, achados 20 e 22).
13. **Sem IDs internos (tarefa, UUID, slug) em texto para o usuário** (§12.4, achados 18 e 19).

## 4. Correções no `ui-standards` (conflitos encontrados)

| Seção | Antes | Depois |
|---|---|---|
| §2.1 | `postcss.config.mjs` "arquivo novo a criar" | Já existe; regra de `@layer base` adicionada. |
| §2.2 | "Tema escuro não precisa de entradas adicionais" | Falso para tokens semânticos (achado 5). |
| §4.1 | "Esse script deve ser atualizado"; claro = ausência de atributo | O script já suporta 3 valores e grava `data-tema="claro"`. |
| §4.2 / §6.6 | Seletor de tema no rodapé da sidebar | Implementado no topo (dropdown). O pedido de produto é o rodapé; marcado como pendente. |
| §5.1 | Mobile: "barra horizontal no topo" | Hambúrguer + Sheet + bottom bar abaixo de 980 px. |
| §6.1 | "Migrada para shadcn Sidebar" | Não existe `components/ui/sidebar.tsx`; a navegação é `MenuLateral` próprio. |
| §6.4 | Grupos colapsáveis "não implementado" | Mantido como proposta ([§7](#7-proposta-de-reorganização-da-sidebar)). |
| §7.1 | `< 768 px (hipótese)` | 980 px, conforme `shell.module.css`. |
| §7.2 | Prioridade por perfil | Implementação atual: 4 primeiros itens (achado 14). |
| §8.6 | `rgba(…)` literal | Só o token `--overlay-modal`. |
| §10.3 | "Limpar visível apenas quando há filtros" | Espaço reservado e sem salto de layout. |
| §13.1 | `DialogFooter` com botões `flex-1` sempre | `flex-1` só abaixo de 650 px; no desktop, alinhado à direita. |
| §11.1 | `EstadoVazio` com `variante="inline" \| "painel"` | O componente não tem `variante`; documentada a API real (`icone`, `titulo`, `descricao`, `acao`). |
| §18.4 | `cortes.module.css` como exemplo | O arquivo foi removido; CSS Modules restantes: `auth`, `shell`, `ui`. |

---

## 5. Recomendações pontuais (não generalizar)

- **Detalhe da Demanda:** a Ficha (leitura + formulário sempre abertos) alonga a página. Ler inline e editar em `Sheet` à direita. `StatusControle` como grupo de botões espaçados (ou `Select` + Confirmar).
- **Aprovações:** lista de entregas em cards com nome, versão e link "Ver arquivo" como `Button variant="outline"`.
- **Agenda:** o calendário de cerca de 320 px no desktop desperdiça espaço; ocupar o container e abrir um painel do dia ao clicar.
- **Mídia Móvel:** a coluna de cerca de 380 px é adequada ao formulário de reserva, mas a lista de reservas deveria usar a largura padrão.
- **Ficha Técnica (`/ficha-tecnica`):** hoje só diz para ir ao detalhe; deveria listar as Demandas que aguardam ficha, com link direto.
- **Preferências:** o card centralizado é aceitável para formulário curto; falta cabeçalho de página (`h1`).
- **Usuários / detalhe:** "Desativar usuário" com variante destrutiva + `AlertDialog`; as permissões como lista de `Switch` em vez de pares de botões Conceder/Revogar.
- **Cortes:** remover o card externo e usar só o wrapper da tabela.
- **Auditoria:** mapear ação → rótulo e alvo → nome legível; detalhe completo em tooltip ou expansão.

---

## 6. Critérios de escolha

### Container de página

| Tipo de tela | Largura | Exemplos |
|---|---|---|
| Lista, tabela, quadro | Largura total do conteúdo (sem max-width) | Demandas, Captações, Drone, Usuários, Lixeira, Auditoria, Cortes |
| Formulário, detalhe, preferências | `max-w-3xl`, alinhado à esquerda (não centralizar, para o título alinhar com o das listas) | Nova/Editar *, detalhe de Usuário, Preferências |

### Tabela × cards × grid

- **Tabela:** registros homogêneos com 4 ou mais atributos comparáveis e ações por linha (Usuários, Drone, Captações, Lixeira, Auditoria, Cortes). Abaixo de 650 px, a tabela rola dentro do wrapper e oculta colunas secundárias (`hidden sm:table-cell`), mantendo status e ações.
- **Cards em lista:** item com título longo, vários badges e metadados heterogêneos, lido de cima para baixo (Demandas, Pendências, Aprovações).
- **Grid de cards:** itens independentes e comparáveis visualmente, sem ordem forte (futuro Catálogo de Equipamentos e Dashboard).

### Dialog × Sheet × AlertDialog × página

- **AlertDialog:** confirmação de ação destrutiva ou irreversível (excluir, cancelar registro, desativar usuário, redefinir PIN).
- **Dialog:** tarefa curta (até cerca de 4 campos) que não precisa do contexto ao lado (solicitar adiamento, conceder permissão).
- **Sheet à direita:** editar um item mantendo a lista ou o detalhe visível (ficha técnica, filtros avançados, edição rápida).
- **Página própria:** criação e edição longas ou com URL compartilhável (Nova Demanda, Editar Demanda).

---

## 7. Proposta de reorganização da sidebar

Hoje o Admin vê 21 itens planos em 6 grupos; o grupo Administração exige rolagem em 900 px de altura.

Proposta (não implementada; a ordem e os grupos continuam vindo de `lib/modules.ts`):

1. **Grupos colapsáveis** com `ChevronRight` (fechado) / `ChevronDown` (aberto), estado persistido por grupo. O grupo da rota ativa abre sempre.
2. **Módulos reservados** (Dashboard, Relatório, Ranking, Analista, Wiki, Equipamentos) agrupados em "Em breve", recolhido por padrão, ou ocultos até ficarem prontos — **decisão de produto**.
3. **Conta** (Preferências, tema, sair) no rodapé fixo da sidebar, com o seletor Claro/Escuro/Sistema. O ícone de tema sai do topo.
4. **Tooltip só no modo recolhido** (hoje aparece também expandido).
5. Renomear "Enviar Ficha Técnica" → "Ficha Técnica" para casar com o título.

### Pendências e Agenda viram abas de Demandas?

**Decisão recomendada: não.** Manter as duas como destinos próprios e adicionar links contextuais a partir de Demandas.

- **Permissões diferentes:** Pendências é do Influencer (e do Admin); Agenda depende de `verAgenda`. Abas exigiriam esconder abas por perfil dentro de Demandas, uma segunda camada de autorização na UI, e o acesso direto continuaria precisando de rota própria.
- **Perguntas diferentes:** Demandas é "o que existe e em que estado"; Pendências é "o que **eu** devo agora" (tarefa pessoal, com ações próprias de confirmar e adiar); Agenda é "quando publica" (visão temporal).
- **Mobile:** para o Influencer, Pendências é o destino principal e deve estar na bottom bar; uma aba dentro de Demandas ficaria a dois toques.
- **Links diretos e histórico:** notificações e e-mails apontam para `/pendencias`; abas por query string tornariam isso frágil.

Alternativa de menor custo: em Demandas, um aviso "Você tem N pendências" com link, e a data de postagem do card ligando para a Agenda daquele dia.

---

## 8. Limitações e hipóteses não confirmadas

- **Automação:** o navegador de automação injeta `data-cursor-ref`, o que gera erros de hidratação falsos (`MenuLateral.tsx:113/160`). O achado 12 tem uma causa real (o init do `AlternarTema`), mas a perda de `data-tema` precisa ser reproduzida num navegador limpo.
- **Contraste** avaliado visualmente e por cálculo aproximado dos tokens, sem ferramenta de auditoria (axe/Lighthouse).
- **Foco e teclado:** só a navegação básica foi observada; não houve um percurso completo por Tab em cada tela.
- **`prefers-reduced-motion`:** a regra global existe (`globals.css`), mas a emulação não foi testada.
- **Perfil Editor** não visualizado (ver §1.2).
- **Achado 17** (perfis atendidos) é hipótese de regra de domínio: confirmar a lista oficial com a fatia S1-05.
- **Influencer vê o resumo de carga de todos os editores** em Demandas (`demandas-1440-escuro-influencer`): pode ser intencional; confirmar com o produto se é informação que o Influencer deve ver.
- Prints em DPR 1 e em modo dev: o selo "N Issues" do Next.js aparece no canto inferior esquerdo e não faz parte da UI. Nos prints de página inteira a sidebar não acompanha a altura total (efeito da captura além do viewport).
- Dados: só seed sintético. Um e-mail fora de `@exemplo.test` presente no banco local foi mascarado no DOM (`oculto@exemplo.test`) antes de cada captura de Usuários.

---

## 9. Base de gráficos (ECharts)

Infraestrutura sem uso em páginas: `components/charts/` (`echarts.ts`, `tema-loumar.ts`, `Grafico.tsx`, `index.ts`). Regras de uso em `docs/agents/ui-standards.md` §21.

## 10. Status pós-refatoração

A refatoração de UI aplicou as decisões recomendadas desta auditoria. Rotas, regras, permissões e dados não mudaram.

- CTAs: regras de elemento em `@layer base`, para o utilitário do `Button` vencer a cor do `a`.
- Shell: colunas `minmax(0, 1fr)`; páginas sem `<main>` próprio; tabelas no `TabelaWrapper`.
- Tema: três botões no rodapé da sidebar e do Sheet; `localStorage` só depois da montagem. 980 px permanece o breakpoint.
- Navegação: grupos colapsáveis, reservados em "Em breve", bottom bar por prioridade (4 + Mais). Prêmios não tem barra nem hambúrguer.
- Telas: `CabecalhoPagina` (um `h1`), `RodapeAcoes`, `AcoesLinha`, datas em `lib/datas.ts`, sentinela `"nenhum"` / `"todos"` nos selects.
- Módulo reservado não mostra mais o id da fatia (`S1-02 #11557`).

A evidência automatizada está em `e2e/layout.spec.ts`, `e2e/tema.spec.ts` e `e2e/navegacao.spec.ts` (estouro, um `main`, um `h1`, ausência de id interno, tema e navegação). Os prints originais continuam em `docs/agents/ui-audit/prints/`. As rotas que estouravam foram recapturadas com o sufixo `-depois`: `demandas-1440-escuro-depois`, `usuarios-650-escuro-depois`, `auditoria-390-escuro-depois`, `cortes-390-escuro-depois`, `drone-390-escuro-depois`, `pendencias-390-escuro-depois`. Em todas, `scrollWidth` ficou igual à largura da janela.

Fora do escopo, como dependência: a lista "Perfil atendido" do Drone (fatia S1-05) e se o Influencer deve ver o resumo de carga de todos os editores.
