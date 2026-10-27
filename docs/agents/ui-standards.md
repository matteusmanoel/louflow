# UI Standards — LouFlow

**Audiência:** agentes e contribuidores que constroem ou refatoram interfaces do LouFlow.
**Fonte de identidade visual:** `app/globals.css` e `docs/design-tokens.md` — **não substituir tokens existentes**.
**Referências de organização:** `docs/agents/ui-standards.md` da Rede Leleco HR (estrutura e profundidade, não identidade).

---

## Sumário

1. [Escopo](#1-escopo)
2. [Stack e tecnologias](#2-stack-e-tecnologias)
3. [Tokens de identidade visual](#3-tokens-de-identidade-visual)
4. [Temas](#4-temas)
5. [Layout e shell](#5-layout-e-shell)
6. [Navegação — Sidebar](#6-navegação--sidebar)
7. [Navegação — Mobile bottom bar](#7-navegação--mobile-bottom-bar)
8. [Componentes base](#8-componentes-base)
9. [Formulários](#9-formulários)
10. [Tabelas e listas](#10-tabelas-e-listas)
11. [Estados compartilhados](#11-estados-compartilhados)
12. [Toasts (Sonner)](#12-toasts-sonner)
13. [Diálogos, painel de entidade e quadro](#13-diálogos-e-confirmações)
14. [Badges e status](#14-badges-e-status)
15. [Acessibilidade](#15-acessibilidade)
16. [Responsividade](#16-responsividade)
17. [Animações e movimento](#17-animações-e-movimento)
18. [Migração das interfaces existentes](#18-migração-das-interfaces-existentes)
19. [Checklist para agentes](#19-checklist-para-agentes)
20. [Living doc](#20-living-doc)
21. [Gráficos (ECharts)](#21-gráficos-echarts)

---

## 1. Escopo

- **Painel autenticado** `app/(app)/` — toda interface de operação do produto.
- **Login e troca de PIN** `app/(auth)/` — ajustes pontuais onde divergir dos padrões abaixo.
- **Fora do escopo:** Painel de TV `app/tv/` (identidade separada, tokens próprios em `app/tv/tv.css`).

---

## 2. Stack e tecnologias

| Camada | Decisão | Notas |
|---|---|---|
| Framework | Next.js App Router + TypeScript | Já em uso |
| Estilização | **Tailwind CSS v4** | Coexiste com CSS Modules existentes durante a migração |
| Componentes | **shadcn/ui** (código copiado para `components/ui/`) | Estilizado com tokens Loumar, não com o visual padrão |
| Ícones | **Lucide React** | Tree-shakeable; `aria-hidden` + `aria-label` conforme o contexto |
| Toasts | **Sonner** | Um `<Toaster>` em `app/(app)/layout.tsx` |
| Fonte | Inter e Manrope no texto; Fraunces em títulos, números e caracteres de destaque | `next/font` em `app/fontes.ts` |
| CSS Modules | Mantidos em componentes existentes até migração | Não forçar migração antecipada |
| Animações | CSS transitions via Tailwind | Sem Framer Motion |

### 2.1 Tailwind v4 — configuração

Tailwind v4 não usa `tailwind.config.ts`. A configuração é inteiramente em CSS:

```css
/* app/globals.css — adicionar no topo */
@import "tailwindcss";

/* Define a variante dark apontando para o atributo data-tema do projeto.
   @custom-variant é a sintaxe correta do Tailwind v4 para definir variantes novas.
   @variant (sem "custom") serve apenas para *aplicar* variantes em regras CSS. */
@custom-variant dark (&:where([data-tema="escuro"], [data-tema="escuro"] *));

/* Expor tokens Loumar como utilitários Tailwind.
   @theme inline é obrigatório quando os valores são referências a CSS variables:
   sem "inline" o compilador tenta resolver o var() no build e gera saída incorreta;
   com "inline" ele emite var(--nome) no output, permitindo a troca em runtime pelo tema. */
@theme inline {
  --color-loumar-950: var(--loumar-950);
  --color-loumar-900: var(--loumar-900);
  --color-loumar-800: var(--loumar-800);
  --color-loumar-700: var(--loumar-700);
  --color-loumar-600: var(--loumar-600);
  --color-loumar-100: var(--loumar-100);
  --color-loumar-50:  var(--loumar-50);

  --color-superficie:  var(--superficie);
  --color-fundo-app:   var(--fundo-app);
  --color-borda-app:   var(--borda-app);
  --color-texto-forte: var(--texto-forte);
  --color-texto-suave: var(--texto-suave);

  --color-alerta-atrasada: var(--alerta-atrasada);

  --radius-botao:  var(--raio-botao);
  --radius-card:   var(--raio-card);
  --radius-modal:  var(--raio-modal);
  --radius-pilula: var(--raio-pilula);

  --shadow-card:   var(--sombra-card);
  --shadow-botao:  var(--sombra-botao);
  --shadow-modal:  var(--sombra-modal);
}
```

As variáveis CSS continuam sendo a **fonte de verdade**. O bloco `@theme inline` cria utilitários Tailwind que as referenciam em tempo de execução (ex: `bg-superficie`, `text-texto-forte`, `rounded-card`). Nenhum valor é duplicado; as trocas de tema escuro/claro funcionam automaticamente porque os tokens são resolvidos pelo navegador.

**PostCSS** (`postcss.config.mjs`, já presente no projeto):
```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

**Camadas (confirmado na auditoria de 22/10/2026).** No Tailwind v4 os utilitários são emitidos dentro de `@layer utilities`. Qualquer regra **sem camada** em `globals.css` vence qualquer utilitário, seja qual for a especificidade. Por isso:

- Estilos base de elementos (`*`, `html`, `body`, `a`, `button`, `input`, `h1`–`h4`) ficam dentro de `@layer base { … }`.
- Exemplo do bug: `a { color: var(--loumar-700) }` sem camada deixa invisível todo `<Button asChild><Link/></Button>`, porque o texto fica da cor do fundo do botão.
- Regras de componente sem Tailwind (CSS Modules) não precisam de camada, mas não podem estilizar elementos genéricos globalmente.

**Dependências** (`devDependencies`):
```
tailwindcss
@tailwindcss/postcss
```

### 2.2 shadcn/ui — configuração

shadcn/ui copia componentes para `components/ui/`. O mapeamento dos seus tokens semânticos para os tokens Loumar é feito em `globals.css`, sem substituir os tokens existentes:

```css
/* globals.css — adicionar na seção :root, sem remover os tokens --loumar-* */
:root {
  /* Mapeamento shadcn → tokens Loumar (modo claro) */
  --background:          var(--fundo-app);
  --foreground:          var(--texto-forte);
  --card:                var(--superficie);
  --card-foreground:     var(--texto-forte);
  --primary:             var(--loumar-700);
  --primary-foreground:  var(--branco);
  --secondary:           var(--loumar-50);
  --secondary-foreground:var(--loumar-800);
  --muted:               var(--loumar-50);
  --muted-foreground:    var(--texto-suave);
  --border:              var(--borda-app);
  --input:               var(--borda-app);
  --ring:                var(--loumar-600);
  --radius:              var(--raio-card);
  --destructive:         var(--alerta-atrasada);
  --destructive-foreground: var(--branco);
}

[data-tema="escuro"] {
  /* Reaproveitam automaticamente as variáveis já sobrescritas em [data-tema="escuro"] */
}
```

Os aliases shadcn seguem automaticamente os tokens que `[data-tema="escuro"]` sobrescreve (`--superficie`, `--fundo-app`, `--texto-*`, `--loumar-50/100`, `--alerta-*`, tabela).

**Isso não vale para os tokens semânticos que só existem em `:root`** (`--prioridade-*`, `--chip-*`, `--linha-atrasada-*`, `--linha-prazo-*`). Hoje eles ficam com o valor claro no tema escuro: badges em pílula branca e cards atrasados rosa-claro. Regra: **todo token de cor novo ou existente precisa de valor no bloco `[data-tema="escuro"]`**, e o par fundo/texto precisa de contraste AA nos dois temas. `--destructive-foreground` também precisa de valor escuro, porque branco sobre `#ff8a80` não passa no AA.

### 2.3 Utilitário `cn()`

Criar `lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Dependências: `clsx`, `tailwind-merge`.

---

## 3. Tokens de identidade visual

Os tokens abaixo estão definidos em `app/globals.css` e documentados em `docs/design-tokens.md`. **Nenhum componente usa valores hex soltos** — apenas variáveis.

**Só referenciar tokens que existem.** `var(--x)` inexistente não dá erro de build: a propriedade simplesmente não se aplica. A escala da marca é 950/900/800/700/600/100/50; não existe `--loumar-400`, que hoje é usado em `hover:` de Preferências e Agenda. Token novo é adicionado em `globals.css` (claro **e** escuro) e em `docs/design-tokens.md` no mesmo PR.

### 3.1 Escala da marca

| Utilitário Tailwind | Variável CSS | Valor (modo claro) | Uso |
|---|---|---|---|
| `bg-loumar-950` | `--loumar-950` | `#00283d` | Fundo do menu lateral (fim do gradiente) |
| `bg-loumar-900` | `--loumar-900` | `#003b59` | Fundo do menu lateral (início) |
| `bg-loumar-800` | `--loumar-800` | `#075577` | Início do gradiente do botão principal |
| `text-loumar-700` / `border-loumar-700` | `--loumar-700` | `#0875a8` | Links, aba ativa, borda do botão |
| `bg-loumar-600` | `--loumar-600` | `#0b8dca` | Fim do gradiente do botão; borda de foco |
| `bg-loumar-100` | `--loumar-100` | `#dff3fb` | Hover de superfícies, chip "Concluída" |
| `bg-loumar-50` | `--loumar-50` | `#f2f9fc` | Realces suaves, fundo de seção |

### 3.2 Superfícies e texto

| Utilitário | Variável | Claro | Escuro |
|---|---|---|---|
| `bg-superficie` | `--superficie` | `#ffffff` | `#102733` |
| `bg-fundo-app` | `--fundo-app` | `#eef3f6` | `#071922` |
| `border-borda-app` | `--borda-app` | `#dce5ea` | `#294654` |
| `text-texto-forte` | `--texto-forte` | `#183143` | `#edf7fb` |
| `text-texto-suave` | `--texto-suave` | `#667985` | `#9fb6c2` |

### 3.3 Status semânticos

Cores de prioridade, status de demanda, captação, corte e alertas de prazo estão documentadas em `docs/design-tokens.md` §3. Use sempre as variáveis correspondentes (ex: `var(--prioridade-urgente-fundo)`). **Nunca redefina ou substitua esses tokens por página.**

### 3.4 Raios

| Token CSS | Tailwind | Valor | Elemento |
|---|---|---|---|
| `--raio-botao` | `rounded-botao` | 9 px | Botão principal |
| `--raio-botao-neutro` | — | 8 px | Botão neutro, itens de menu |
| `--raio-input` | — | 10 px | Inputs |
| `--raio-card` | `rounded-card` | 12 px | Cards, tabelas, painéis |
| `--raio-painel` | — | 14 px | Painéis de filtro |
| `--raio-modal` | `rounded-modal` | 16 px | Modais e dialogs |
| `--raio-pilula` | `rounded-pilula` | 999 px | Badges e chips |

### 3.5 Sombras

| Token CSS | Tailwind | Elemento |
|---|---|---|
| `--sombra-botao` | `shadow-botao` | Botão principal |
| `--sombra-card` | `shadow-card` | Cards |
| `--sombra-modal` | `shadow-modal` | Modais |
| `--anel-foco` | — | Ring de foco (aplicado globalmente via `:focus-visible`) |

O anel de foco global está em `globals.css` no seletor `:focus-visible`. Componentes não precisam redefinir foco — o padrão já está ativo.

---

## 4. Temas

### 4.1 Comportamento definido

| Situação | Comportamento |
|---|---|
| Primeiro acesso (sem preferência salva) | Tema **escuro** |
| Usuário escolhe **Claro** | Força claro independente do SO |
| Usuário escolhe **Escuro** | Força escuro independente do SO |
| Usuário escolhe **Sistema** | Acompanha `prefers-color-scheme` do SO em tempo real |

O armazenamento da preferência usa `localStorage` com chave `louFlowTema`. Valores: `'claro'`, `'escuro'`, `'sistema'`.

`app/layout.tsx` restaura o tema com um script inline antes da pintura, para evitar flash. O script **já suporta** os três valores e sempre grava o atributo:

```ts
// Comportamento implementado em app/layout.tsx (resumo)
const t = localStorage.getItem('louFlowTema');
if (t === 'sistema') d.dataset.tema = matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
else if (t === 'claro') d.dataset.tema = 'claro';
else d.dataset.tema = 'escuro'; // 'escuro' ou nada salvo
```

`data-tema` está sempre presente (`"claro"` ou `"escuro"`). Seletores CSS não podem depender da ausência do atributo. Em `'sistema'`, `AlternarTema` escuta `prefers-color-scheme` em tempo real.

### 4.2 Seletor do tema

- **Implementado:** `AlternarTema.tsx` são três botões de ícone (`Sun`, `Moon`, `Monitor`) com `aria-pressed`, no rodapé da sidebar e do Sheet. O topbar não tem seletor, exceto no perfil com um destino só (Prêmios) e só abaixo de 980 px, porque a sidebar não é exibida nesse breakpoint.
- **Hidratação:** o tema salvo não entra no render inicial (`useState` não lê `localStorage`). O valor é lido depois de montar; até lá nenhum botão fica pressionado. O script de `app/layout.tsx` já pintou `data-tema`.

### 4.3 Painel de TV

O `app/tv/` usa tokens e folha próprios (`app/tv/tv.css`). Não herda `[data-tema]`. Não é afetado por este padrão.

### 4.4 Tailwind e dark mode

A variante `dark:` do Tailwind está configurada para reagir a `[data-tema="escuro"]` (ver §2.1). Não usar a variante `dark:` para lógica de cor que não mude entre temas — usar apenas os tokens Loumar que já trocam automaticamente.

```tsx
// ✅ Correto — token troca automaticamente no tema escuro
<div className="bg-superficie text-texto-forte" />

// ✅ Correto — quando é realmente necessário comportamento visual diferente por tema
<div className="bg-superficie dark:bg-loumar-900" />

// ❌ Incorreto — hex solto, não rastreável pelo sistema de tokens
<div style={{ background: '#102733' }} />
```

---

## 5. Layout e shell

### 5.1 Grade atual

O shell está em `components/shell/` e usa CSS Grid:

```
┌──────────────────┬──────────────────────────────────┐
│  Sidebar 256 px  │  Topbar (76 px, sticky)           │
│  (sticky,        ├──────────────────────────────────┤
│   100vh,         │                                   │
│   overflow-y)    │  <main> — conteúdo da página      │
│                  │  padding: var(--conteudo-padding)  │
└──────────────────┴──────────────────────────────────┘
```

- **Recolhido:** sidebar passa de 256 px para 82 px via `data-menu="recolhido"` em `<html>`.
- **Até 1180 px:** padding de conteúdo e menu ligeiramente menores.
- **Abaixo de 980 px:** a sidebar sai da grade; o topbar ganha o botão hambúrguer (`MenuMobile`, `Sheet` à esquerda) e aparece a bottom bar (`BottomBar`, §7).
- **Abaixo de 650 px:** conteúdo com padding reduzido (14 px).
- **Grid do conteúdo:** `.conteudo-shell` é um grid de uma coluna e **precisa** de `grid-template-columns: minmax(0, 1fr)` (ou `min-width: 0` em todos os filhos). Sem isso, uma tabela larga alarga a página inteira; foi o que a auditoria mediu em Usuários, Drone, Auditoria e Cortes (737–932 px num viewport de 390 px).

### 5.2 Topbar

- Altura: 76 px (`--topo-altura`).
- Exibe nome e perfil do usuário à esquerda; ações (tema, sair) à direita.
- Fundo: `var(--superficie)` com `border-bottom: 1px solid var(--borda-app)` e `var(--sombra-topo)`.
- **Não recolorir** o topbar com cores da marca; manter neutro.

### 5.3 Conteúdo das páginas

- **O `AppShell` já renderiza o `<main className="conteudo-shell">` com `var(--conteudo-padding)`.**
- **A página não abre outro `<main>`.** Ela retorna um fragmento ou `<section>`. Dois `<main>` duplicam o landmark e o padding; hoje cerca de 20 páginas fazem isso, cada uma com `p-6`, `max-w-*` e `mx-auto` diferentes.
- **A página não define padding nem largura ad hoc** (`p-6`, `max-w-4xl mx-auto`, `style={{ padding }}`) e **nunca usa `min-w-[…]`**. 650 px é a largura mínima suportada, não uma largura forçada: `min-w-[650px]` em Pendências faz o celular reduzir a página inteira.
- **Largura do conteúdo, só duas opções:**
  - **Total** para listas, tabelas e quadros.
  - **`max-w-3xl` alinhado à esquerda** para formulários, detalhes e preferências. Não centralizar, para que o título fique alinhado com o das listas.
- **Todo destino tem exatamente um `h1`**, no cabeçalho de página (eyebrow do grupo + título). Módulo reservado e Preferências também.
- Estrutura padrão de página:

```tsx
// Página típica — sem padding extra no <main>
export default async function PaginaExemplo() {
  return (
    <>
      <PageHeader title="Título" action={<Button>+ Nova</Button>} />
      <FilterBar>{/* filtros */}</FilterBar>
      <DataTable>{/* conteúdo */}</DataTable>
    </>
  );
}
```

- Títulos de página: `text-xl font-semibold text-texto-forte` — não usar `font-black` nem tamanhos de display em páginas operacionais.
- Espaçamento entre seções: `gap-4` a `gap-6`.

---

## 6. Navegação — Sidebar

### 6.1 Base: `MenuLateral` próprio

**Estado atual:** a sidebar é o componente próprio `components/shell/MenuLateral.tsx`, sem o `Sidebar` do shadcn (não existe `components/ui/sidebar.tsx`). A identidade é o gradiente `--loumar-900 → --loumar-950` com texto branco; a sidebar continua escura também no tema claro (é a marca).

Migrar para o `Sidebar` do shadcn é opcional e exige PR próprio. Até lá, os exemplos com `SidebarMenuItem` abaixo descrevem a **estrutura** esperada (grupo → item → ícone + rótulo), não um componente que já exista.

### 6.2 Comportamento de recolhimento

- **Desktop:** sidebar recolhível pelo botão ao lado do logo (`PanelLeft`). Recolhida, mostra só o ícone Lucide com tooltip do rótulo; os rótulos de grupo viram espaçamento. Confirmado na auditoria.
- **Tooltip só no modo recolhido.** Com a sidebar expandida, o rótulo já está visível.
- **Transição:** `transition-width duration-300 ease-in-out` respeitando `prefers-reduced-motion` (ver §17).
- **Persistência:** preferência salva em `localStorage` com chave `louFlowMenuRecolhido` (já em uso).

### 6.3 Grupos e itens

Grupos definidos em `lib/modules.ts` (`ORDEM_GRUPOS`): Produção, Postagem, Recursos, Acompanhamento, Administração, Conta.

```tsx
// Estrutura esperada por item
<SidebarMenuItem>
  <SidebarMenuButton asChild isActive={ativo}>
    <Link href={`/${item.slug}`}>
      <ItemIcone slug={item.slug} />   {/* Lucide, aria-hidden */}
      <span>{item.rotulo}</span>
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

Mapeamento de ícones **em uso** (fonte de verdade). Hoje ele está repetido em `MenuLateral.tsx`, `MenuMobile.tsx` e `BottomBar.tsx`. Ícone novo ou alterado muda os três; o ideal é extrair para um mapa único em `components/shell/`.

| Slug | Ícone Lucide |
|---|---|
| `dashboard` | `LayoutDashboard` |
| `demandas` | `FileText` |
| `fichas` | `ListChecks` |
| `ficha-tecnica` | `ClipboardList` |
| `aprovacoes` | `CheckCircle2` |
| `pendencias` | `Clock` |
| `agenda` | `CalendarDays` |
| `captacoes` | `Camera` |
| `midia-movel` | `Smartphone` |
| `drone` | `Plane` |
| `cortes` | `Scissors` |
| `equipamentos` | `Package` |
| `relatorio` | `BarChart2` |
| `ranking` | `Trophy` |
| `analista` | `Brain` |
| `wiki` | `BookOpen` |
| `sorteios` | `Gift` |
| `usuarios` | `Users` |
| `lixeira` | `Trash2` |
| `auditoria` | `Shield` |
| `preferencias` | `Settings` |

### 6.4 Grupos com subitens

Implementado em `components/shell/`. Módulos reservados ficam no grupo virtual "Em breve", fechado por padrão, e não se repetem no grupo original.

- Cada grupo é um disclosure: `<button aria-expanded aria-controls>` com o rótulo e um `ChevronRight`.
- Aberto: o mesmo ícone com `rotate-90 transition-transform motion-reduce:transition-none`.
- O grupo da rota ativa abre sempre e não fecha. O estado dos outros persiste em `louFlowGruposMenu`.
- Com a sidebar recolhida, não há disclosure (só ícones e tooltip).
- Grupos e itens vêm de `lib/modules.ts`. A permissão filtra antes de agrupar. `reservado` só muda o grupo visual.

### 6.5 Estados e acessibilidade

| Estado | Aparência |
|---|---|
| Ativo (`aria-current="page"`) | `bg-white/16 opacity-100` |
| Hover | `bg-white/8 opacity-100` |
| Foco (`focus-visible`) | Anel `var(--anel-foco)` — já aplicado globalmente |
| Desabilitado | Não usado na navegação; se necessário: `opacity-40 pointer-events-none` |

- Todos os links de navegação recebem `aria-current="page"` quando ativos.
- O botão de recolher tem `aria-label="Recolher menu"` / `"Expandir menu"` conforme o estado **persistido** (lido depois da hidratação, não fixo em `false`).
- Navegação por teclado: Tab move entre itens; Enter ativa; grupos colapsáveis respondem a Enter/Space.
- A `<nav>` principal tem `aria-label="Menu principal"`.

### 6.6 Rodapé da sidebar

O rodapé da sidebar e do Sheet tem o seletor de tema e os links Preferências e Sair. Preferências não aparece no grupo Conta. O grupo some quando fica vazio. O topbar fica com o hambúrguer (abaixo de 980 px) e o nome e o perfil.

---

## 7. Navegação — Mobile bottom bar

### 7.1 Quando usar

Abaixo de **980 px** (breakpoint de `shell.module.css`, confirmado na auditoria), a sidebar é substituída por:
- **Botão de menu hambúrguer** no topbar → abre sidebar em `Sheet` (drawer lateral).
- **Bottom bar** fixa com os módulos principais.

### 7.2 Módulos na bottom bar

A bottom bar exibe até **5 módulos** mais relevantes para o usuário autenticado. A seleção é dinâmica: filtra os módulos permitidos ao usuário e escolhe na seguinte ordem de prioridade:

1. `demandas` — acesso universal (todos exceto Prêmios)
2. `aprovacoes` — Admins, Influencers e aprovadores delegados
3. `pendencias` — Influencers e Admins
4. `agenda` — quem tem `verAgenda`
5. `captacoes` — quem tem `verCaptacoes`
6. Fallback: próximo módulo permitido na ordem de `ORDEM_GRUPOS`

A seleção fica em `AppShell`: no máximo 4 itens dessa prioridade e, se ainda houver destino, um "Mais" que abre o Sheet. O rótulo curto vem de `ROTULO_CURTO`. Com 1 destino ou menos, a barra e o hambúrguer não renderizam.

- Rótulo da bottom bar com até ~10 caracteres ("Fichas", "Agenda"), separado do rótulo do menu.
- Com **1 destino ou menos** (perfil Prêmios), não exibir a bottom bar nem o hambúrguer.

### 7.3 Estrutura

```
┌────────────────────────────────────────┐
│  [ícone]   [ícone]   [ícone]  [ícone] [⋯]│
│  Demandas  Aprova.  Agenda  Captaç. Mais │
└────────────────────────────────────────┘
```

- `position: fixed; bottom: 0; left: 0; right: 0`
- Fundo: `bg-superficie border-t border-borda-app`
- Cada item: ícone Lucide (24 px) + rótulo curto (10–11 px), `flex-col items-center`
- Ativo: `text-loumar-700` + indicador visual (linha ou dot acima do ícone)
- Inativo: `text-texto-suave`
- Altura da barra: ~56 px; conteúdo da página recebe `padding-bottom: 64px` em mobile para não ser coberto

### 7.4 Acessibilidade

- `<nav aria-label="Navegação rápida">`, diferente do `aria-label` da sidebar/Sheet ("Menu principal"), para que os dois landmarks sejam distinguíveis.
- Cada item: `aria-current="page"` quando ativo
- Ícones: `aria-hidden="true"` + texto visível abaixo (não usar ícone sem label no mobile)

---

## 8. Componentes base

Todos os componentes de `components/ui/` são baseados no shadcn/ui com estilos adaptados aos tokens Loumar. O código é local — modificar diretamente conforme necessidade do produto.

### 8.1 Button

Substitui o `Botao` atual. Variantes mapeadas para o design Loumar:

| Variante | Aparência | Uso |
|---|---|---|
| `default` | Gradiente `--loumar-800 → --loumar-600`, borda `--loumar-700`, texto branco | Ação principal da tela |
| `outline` | Fundo `--superficie`, borda `--borda-app`, texto `--loumar-800` | Ação secundária, cancelar |
| `ghost` | Sem fundo, sem borda, texto `--loumar-700` | Ações terciárias, links de ação |
| `destructive` | Fundo `--alerta-atrasada`, texto branco | Excluir, desligar, ações irreversíveis |
| `link` | Texto `--loumar-700`, sem fundo, sem borda | Links inline em texto |

Altura padrão: `h-9` (36 px). Radius: `rounded-botao` (9 px).
Estado de carregamento: spinner interno quando `isLoading` — `<Loader2 className="animate-spin" />`.

```tsx
// ✅ Correto — Button com ícone
<Button variant="default">
  <Plus className="h-4 w-4" aria-hidden />
  Nova demanda
</Button>

// ✅ Correto — Button destruttivo
<Button variant="destructive">Excluir demanda</Button>

// ❌ Incorreto — usar <a> estilizado como botão
<a style={{ background: 'var(--loumar-700)', ... }}>Nova demanda</a>
```

**Para navegação (Link → aparência de botão):**
```tsx
// Usar ButtonLink ou asChild do Button
<Button asChild variant="default">
  <Link href="/demandas/nova">+ Nova demanda</Link>
</Button>
```

O `Botao` legado em `components/ui/index.tsx` permanece disponível para componentes existentes durante a migração. Novos componentes **sempre** usam o `Button` do shadcn.

### 8.2 Input, Label, Select, Textarea

Substituem o `Campo` atual. Altura mínima: `h-9`. Radius: 10 px (CSS var; `rounded-[var(--raio-input)]`). Fundo: `bg-superficie`. Borda: `border-borda-app`.

```tsx
// Padrão completo para campo de formulário
<div className="space-y-1.5">
  <Label htmlFor="titulo">
    Título <span className="text-alerta-atrasada" aria-hidden>*</span>
  </Label>
  <Input id="titulo" name="titulo" required placeholder="Descreva a demanda" />
</div>
```

Estados:
- **Hover:** borda ligeiramente mais escura (`hover:border-loumar-600`)
- **Foco:** `focus-visible:ring-2 focus-visible:ring-loumar-600/20 focus-visible:border-loumar-600`
- **Desabilitado:** `opacity-50 cursor-not-allowed bg-loumar-50`
- **Erro:** borda `--alerta-atrasada` + mensagem abaixo em `text-xs text-alerta-atrasada`

O `Campo` legado em `components/ui/index.tsx` permanece para componentes existentes.

### 8.3 Card

Base para painéis, seções e containers de conteúdo:
- `bg-superficie border border-borda-app rounded-card shadow-card`
- Padding padrão: `p-5`

```tsx
<Card>
  <CardHeader>
    <CardTitle>Captações</CardTitle>
    <CardDescription>Agendamentos do videomaker</CardDescription>
  </CardHeader>
  <CardContent>{/* conteúdo */}</CardContent>
</Card>
```

O `Cartao` legado permanece para componentes existentes.

### 8.4 Alert

Substitui o `Aviso` atual:

| Variante | Uso |
|---|---|
| `default` | Informação neutra |
| `destructive` | Erro de formulário, ação inválida |
| (custom) `aviso` | Aviso contextual (amarelo) — criar variante usando tokens `--chip-aprovacao-*` |

O `Aviso` legado permanece para componentes existentes.

### 8.5 Tabs

Padrão para páginas com seções alternáveis (ex: detalhe de Demanda):
- `TabsList`: `bg-loumar-50 rounded-card p-1`
- `TabsTrigger` ativo: `bg-superficie shadow-sm text-texto-forte`
- `TabsTrigger` inativo: `text-texto-suave hover:text-texto-forte`
- Altura estável: o painel de conteúdo deve ter `min-h-[...]` definido para não causar salto ao trocar de aba.

### 8.6 Sheet

Para drawers laterais (formulários, detalhes, filtros avançados):
- `side="right"` por padrão
- Largura: `sm:max-w-md` (formulários simples) ou `sm:max-w-lg` (conteúdo mais denso)
- Overlay: `bg-[var(--overlay-modal)]`. O valor fica só no token em `globals.css`; nunca repetir o `rgba` no componente.

### 8.7 Dropdown Menu

Para ações em linhas de tabela (kebab menu):
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="Ações">
      <MoreHorizontal className="h-4 w-4" aria-hidden />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>Editar</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 9. Formulários

### 9.1 Estrutura padrão

```tsx
// Formulário com Server Action (padrão do LouFlow)
<form action={serverAction} className="space-y-4">
  <div className="space-y-1.5">
    <Label htmlFor="campo">Rótulo</Label>
    <Input id="campo" name="campo" />
  </div>
  {/* ... mais campos */}
  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
    <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
    <Button type="submit">Salvar</Button>
  </div>
</form>
```

**Rodapé de ações (regra única para formulário, Dialog e AlertDialog).** A auditoria encontrou quatro ordens diferentes (Voltar | Agendar; Registrar | Cancelar; só a primária; Salvar | Cancelar | Excluir).

- Desktop: alinhado à direita; **secundária à esquerda, primária à direita**.
- Abaixo de 650 px: empilhado e em largura total, com a primária **em cima** (`flex-col-reverse`).
- Rótulo da secundária: "Cancelar" quando descarta a edição; "Voltar" só quando nada foi editado. Não usar "Cancelar" para uma ação que destrói um registro: nesse caso o rótulo diz o que acontece ("Cancelar captação" num botão destrutivo, com `AlertDialog`).
- Ação destrutiva no formulário de edição (Excluir) fica **separada**, à esquerda do rodapé ou numa seção "Zona de risco" no fim, nunca ao lado de Salvar.
- Todo formulário de criação ou edição tem a saída secundária (Cancelar/Voltar).
- Campos obrigatórios marcados com `*` no `Label` de forma consistente em todo o formulário.

### 9.2 Campos de seleção

- Lista curta e estática (até ~8 opções fixas): `Select` do shadcn.
- Lista longa ou carregada dinamicamente: `Combobox` (shadcn Command + Popover).
- Múltipla seleção: `MultiSelect` — criar em `components/ui/` quando necessário.
- **`SelectItem` nunca usa `value=""`** (o Radix proíbe: o valor vazio é reservado para limpar a seleção). Para "Todos" ou "Nenhum", usar um sentinela (`"todos"`, `"nenhum"`) e convertê-lo para vazio ou `null` na submissão. Hoje isso ocorre em `QuadroDemandas` e `FormDemanda`.
- O valor salvo precisa existir na lista de opções; se não existir, o `Select` aparece vazio na edição. Lista de opções e dado persistido vêm da mesma fonte (constante de domínio da fatia).

### 9.3 Feedback de erro de formulário

- Erros de campo: texto `text-xs text-alerta-atrasada mt-1` abaixo do input.
- Erro geral do formulário: `Alert variant="destructive"` acima dos campos.
- **Não usar** `window.alert()` ou `window.confirm()` — usar Dialog (§13).

### 9.4 Estado pendente

- Botão de submit: `disabled` + spinner interno quando a Server Action está em progresso.
- Usar `useFormStatus()` ou `useTransition()` conforme o padrão já estabelecido no projeto.

### 9.5 Datas

- Datas conhecidas (nascimento, datas históricas): `<Input type="date" />` — nativo, sem calendar picker.
- Datas de agendamento e prazos operacionais: date picker com calendário (construir com shadcn Popover + Calendar quando necessário).
- Formato de exibição: `dd/MM/yyyy` com `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })`, **em todas as telas**. Nunca exibir a string ISO crua (`2026-10-25`), como acontece hoje em Cortes. Data e hora: `dd/MM/yyyy HH:mm`.
- Datas em tabela usam a fonte de texto (não a Fraunces de números de destaque), com `tabular-nums`.

---

## 10. Tabelas e listas

### 10.1 Estrutura padrão de tabela

```
[Toolbar: busca + filtros + ação primária]
[Table: thead sticky, tbody scrollável, coluna de ações sticky à direita]
[Paginação]
```

- Wrapper: `rounded-card border border-borda-app overflow-hidden shadow-card`
- Cabeçalho: `bg-[var(--tabela-cabecalho-fundo)] text-[var(--tabela-cabecalho-texto)]` — 11 px, uppercase, `letter-spacing: 0.045em`
- Borda de linha: `border-b border-[var(--tabela-linha-borda)]`
- Hover de linha: `hover:bg-[var(--tabela-linha-hover)] cursor-pointer`
- Coluna de ações: sticky à direita (`sticky right-0`), `bg-superficie`

### 10.2 Coluna de ações

- Usar `DropdownMenu` (§8.7) em vez de múltiplos ícones-botão ou links de texto na linha. Hoje Captações, Drone, Usuários, Lixeira e Cortes mostram "Editar / Cancelar / Excluir / Restaurar" como links soltos.
- A coluna é a última, alinhada à direita, `sticky right-0 bg-superficie` e com largura fixa (`w-12`). Cabeçalho com `<span className="sr-only">Ações</span>`.
- Gatilho: `Button variant="ghost" size="icon"` com `MoreHorizontal` e `aria-label="Ações de <identificação da linha>"`.
- Item destrutivo por último, depois de um `DropdownMenuSeparator`, em `text-destructive`; ele abre um `AlertDialog` e não executa direto.
- Ação primária (ex.: Editar/Abrir) pode ser o clique na linha inteira; o kebab continua tendo a ação para quem navega por teclado.

### 10.3 Toolbar de filtros

- Busca por nome/texto: `Input type="search"` sempre visível.
- Filtros avançados: acessíveis via botão que abre `Sheet` à direita.
- Contagem de filtros ativos: badge numérico no botão de filtros quando > 0.
- **Ativar um filtro não pode mudar o layout da toolbar.** Em `/demandas`, o "Limpar" aparecia entre Filtrar e Nova demanda e encolhia a busca. O botão "Limpar filtros" fica sempre renderizado: `disabled` (ou `invisible` com espaço reservado) quando não há filtro, ativo quando há. Alternativa: um link "Limpar" na linha do resumo dos filtros, fora da toolbar.
- A ação primária da página (ex.: "Nova demanda") aparece **uma vez**, no cabeçalho da página, e não se repete na toolbar.
- No mobile, os filtros avançados ficam recolhidos (botão "Filtros" com contagem que abre `Sheet`); o painel de filtros aberto não ocupa a primeira tela inteira.

### 10.4 Estados de linha

- Linha atrasada: `bg-[var(--linha-atrasada-fundo)]` — não replicar por componente; centralizar em helper.
- Linha com prazo próximo: `bg-[var(--linha-prazo-fundo)]`.

### 10.5 Paginação

Usar o componente `Pagination` do shadcn. Tamanhos de página sugeridos: 25, 50, 100. Não exibir todos os registros sem paginação em listas operacionais.

---

## 11. Estados compartilhados

### 11.1 `EstadoVazio`

Componente único em `components/ui/estado-vazio.tsx`. **API implementada** (não há prop `variante`):

```tsx
<EstadoVazio
  icone={Video}                 // LucideIcon (o componente, não o elemento); opcional
  titulo="Nenhuma captação"     // obrigatório
  descricao="As captações agendadas aparecerão aqui."   // opcional
  acao={<Button>Agendar captação</Button>}               // opcional
  className="py-8"              // para ajustar o espaço vertical (padrão py-16)
/>
```

Regra: com ícone e `py-16` (padrão) para tabelas, páginas e drawers; sem ícone e com `className="py-4"` para listas pequenas e dropdowns.

### 11.2 Estados de carregamento

**`loading.tsx` por rota:**  
O Next.js App Router usa `loading.tsx` como limite de Suspense automático para a rota. Colocar em rotas com fetch de dados (ex: `app/(app)/demandas/loading.tsx`).

> ⚠️ `loading.tsx` cobre o carregamento inicial da rota ao navegar. Ele **não** cobre re-fetches parciais dentro da mesma página, dados carregados via Server Actions, nem componentes com `<Suspense>` explícito dentro da página. Para esses casos, usar `isPending` de `useTransition` ou spinner local.

Conteúdo padrão do `loading.tsx`:
```tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="h-8 w-8 animate-spin text-texto-suave" aria-label="Carregando..." />
    </div>
  );
}
```

**Skeletons:**  
Usar `Skeleton` do shadcn para conteúdo com geometria previsível: tabelas com colunas conhecidas, cards de demanda, cards de métricas. Não criar skeletons para layouts imprevisíveis.

```tsx
// Skeleton para linha de tabela
<div className="flex gap-3 py-3">
  <Skeleton className="h-4 w-48" />
  <Skeleton className="h-4 w-24" />
  <Skeleton className="h-4 w-16" />
</div>
```

Skeletons usam `bg-loumar-50 animate-pulse` no modo claro; `bg-loumar-100/10` no escuro. Não usar cores de conteúdo real.

### 11.3 Estados de erro

- Erro de servidor (dados não carregados): `Alert variant="destructive"` com mensagem descritiva.
- Erro de ação: toast de erro (§12) após o resultado da Server Action no cliente.
- Erro de formulário: `Alert` no topo do formulário + mensagem de campo (§9.3).
- Página de erro genérica: `error.tsx` + `global-error.tsx` conforme convenção do App Router.

---

## 12. Toasts (Sonner)

### 12.1 Configuração

Um único `<Toaster>` em `app/(app)/layout.tsx`:
```tsx
import { Toaster } from 'sonner';

// No layout:
<Toaster
  position="bottom-right"
  toastOptions={{
    classNames: {
      toast:   'bg-superficie border border-borda-app text-texto-forte shadow-card',
      success: 'border-l-4 border-l-[var(--prioridade-normal-texto)]',
      error:   'border-l-4 border-l-[var(--alerta-atrasada)]',
      warning: 'border-l-4 border-l-[var(--prioridade-alta-texto)]',
    },
  }}
/>
```

### 12.2 API de uso

Helpers em `lib/toast.ts`:
```ts
import { toast } from 'sonner';

export const toastSucesso  = (msg: string) => toast.success(msg);
export const toastErro     = (msg: string) => toast.error(msg);
export const toastAviso    = (msg: string) => toast.warning(msg);
export const toastPromessa = <T>(p: Promise<T>, msgs: { loading: string; success: string; error: string }) =>
  toast.promise(p, msgs);
```

### 12.3 Onde chamar

**Toasts são acionados no cliente**, após receber o resultado da Server Action:

```tsx
// ✅ Correto — acionado no cliente depois da ação
'use client';
async function handleSubmit() {
  const resultado = await minhaServerAction(dados);
  if (resultado.ok) {
    toastSucesso('Demanda criada.');
    router.push('/demandas');
  } else {
    toastErro(resultado.mensagem);
  }
}

// ❌ Incorreto — não chamar toast dentro da Server Action
// (Server Actions rodam no servidor; Sonner é biblioteca de cliente)
```

Para Server Actions chamadas via `useActionState` / formulário nativo, o feedback de erro vai no componente `Alert`; o toast fica para navegações pós-sucesso ou ações fora de formulário.

### 12.4 Conteúdo

- Mensagens em português, objetivas e orientadas à ação.
- Sucesso: "Demanda criada." / "Usuário atualizado."
- Erro com causa: "Não foi possível salvar: data inválida." (quando o `resultado.mensagem` traz contexto)
- Não expor stack traces ou IDs internos no toast.
- **A regra vale para qualquer texto visível:** sem IDs de tarefa ou fatia ("S2-02 #11574"), UUIDs, slugs de ação (`conceder_permissao`) ou nomes de permissão em camelCase (`editorPadraoCortes`). Mapear para rótulos legíveis numa fonte única da fatia. Identificadores de negócio que o usuário usa (ex.: código da Demanda) podem aparecer.

---

## 13. Diálogos, painel de entidade e quadro

### 13.1 Dialog curto

`Dialog` fica para tarefa curta, até cerca de 4 campos, que não precisa de URL.

- `DialogContent`: `rounded-modal shadow-modal`
- `DialogHeader`: título (`text-xl font-semibold`) + descrição contextual (não repetir o título)
- `DialogFooter`: Cancelar + Confirmar na ordem da regra de rodapé (§9.1). Botões em `flex-1` só abaixo de 650 px; no desktop, largura natural e alinhados à direita.
- Altura estável: `max-h-[90vh] overflow-y-auto`

**Quando usar cada superfície:**

| Situação | Componente |
|---|---|
| Confirmar exclusão, descarte, cancelamento ou outra ação irreversível | `AlertDialog`, pequeno e por cima do painel |
| Tarefa curta (até ~4 campos), sem URL | `Dialog` |
| Filtros avançados e edição auxiliar que não é a entidade | `Sheet` à direita (`side="right"`; no mobile, largura total) |
| Detalhe, cadastro ou edição de uma entidade (Demanda, Usuário, Captação, Drone e as que vierem) | Painel de entidade (§13.3), com URL |

Formulário expansível inline (ex.: "Solicitar adiamento" em Pendências) só para 1–2 campos. O botão que o fecha diz "Fechar" ou "Descartar", não "Cancelar <ação>", que soa como desfazer.

### 13.2 AlertDialog — confirmações destrutivas

**Nunca usar `window.confirm()`**. Substituir por `AlertDialog`:

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Excluir demanda</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Mover para a Lixeira?</AlertDialogTitle>
      <AlertDialogDescription>
        A demanda será movida para a Lixeira e poderá ser restaurada depois.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleExcluir}>Confirmar</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- Enter confirma quando nenhum input está focado.
- Ação em progresso: desabilitar ambos os botões + spinner no botão de confirmação.
- Não fechar o dialog automaticamente em erro — mostrar mensagem dentro do `AlertDialog`.
- Foco inicial na ação segura (Cancelar/Voltar), padrão do Radix e confirmado no Drone.
- O botão de confirmação destrutivo usa `variant="destructive"` e um rótulo com o verbo ("Excluir", "Cancelar captação"), não "Confirmar".

### 13.3 Painel de entidade

Um componente só serve para detalhe, cadastro e edição. A lista fica por baixo. Há um painel por vez.

**URL.** O clique na linha ou no card abre o painel e leva o endereço para a rota da entidade (`/demandas/[id]`). Entrar direto nessa URL, sem a lista, mostra o mesmo painel em página. Cadastro usa a rota de criação (`/demandas/nova`). Editar troca o painel do detalhe pela rota de edição (`/demandas/[id]/editar`). Cancelar na edição volta ao detalhe. O voltar do navegador desfaz o último endereço.

**Medida.** No desktop o painel chega a 1120 px e a 92% da viewport, com altura de até 90% da tela. Abaixo de 980 px ele ocupa a tela inteira: cabeçalho e rodapé ficam fixos, e só o miolo rola. O formulário, dentro do painel, permanece em `max-w-3xl` alinhado à esquerda. O rodapé do formulário ocupa a largura do painel.

**Abas.** A barra só aparece quando a entidade tem duas seções ou mais. A aba ativa vai na query `aba`. Para Demanda: Detalhes (dados, status e ficha técnica), Entregas, Comentários, Histórico. Para Usuário: Detalhes e Permissões. Cadastro e edição não são abas: são um fluxo só.

**Fechar.** No detalhe, X, Escape, clique no fundo e voltar fecham e devolvem a lista, inclusive `?visao=quadro`. No cadastro e na edição, se o formulário mudou, esses gestos e o Cancelar perguntam "Descartar alterações?" no `AlertDialog`. Salvar com sucesso não pergunta.

**Depois de gravar.** Sucesso atualiza na hora o painel e a lista ou o quadro por trás. Salvar e atualizar mantêm o painel aberto na mesma aba. Excluir ou mover para a lixeira fecha o painel, volta à lista e atualiza só ela. Falha mantém o painel e os dados como estavam. O mecanismo é o `router.refresh()` já usado nas ações, mais a sincronização existente do quadro. Status continua passando por `features/status/`. O refetch só relê o que o servidor gravou.

O mesmo painel vale para as entidades que já têm rota de formulário (Usuários, Captações, Drone) e para as próximas. A primeira implementação é Demandas. As outras adotam o mesmo componente, uma entidade por vez.

### 13.4 Quadro de Demandas

`/demandas` tem duas visões. A lista é a padrão. O quadro fica em `?visao=quadro` e rola na horizontal dentro da página, sem alargar o documento.

As colunas são os oito status, nesta ordem: Não iniciada, Em execução, Pausada, Ajustes solicitados, Aprovação, Concluída, Reprovada, Cancelada. O card abre o painel de §13.3.

Soltar o card só muda o status quando `TRANSICOES` já permite a passagem, pela função de `features/status/`. Passagem inválida devolve o card e mostra a mensagem de domínio. Cancelar pede o motivo antes de gravar. Soltar em Aprovação abre o registro da entrega, porque é a entrega que leva a Demanda para Aprovação. Concluída sai da aprovação, não de um arraste livre. Depois da mudança, o refetch atualiza o quadro e, se o painel estiver aberto, o detalhe.

---

## 14. Badges e status

### 14.1 Regra fundamental

| Tipo | Componente | Comportamento |
|---|---|---|
| Status de domínio (leitura) | `Badge` com variant customizada | `pointer-events-none`; sem hover-as-action |
| Prioridade (leitura) | `Badge` com variant customizada | `pointer-events-none` |
| Ação ou estado interativo | `Button` | hover + focus + cursor-pointer |

**Nunca estilizar um status com `Button` — e nunca estilizar uma ação com `Badge`.**

Situação de registro (Ativo, PIN pendente, Inativo, Na lixeira, Cancelada) também é status: usa `Badge` (`situacao-ativo`, `situacao-pendente`, `situacao-inativo` ou a variante de domínio). A cor nunca é o único sinal; o texto do badge carrega o significado.

### 14.2 Implementação

Um único componente `Badge` do shadcn em `components/ui/badge.tsx`, com variantes via `cva`:

```ts
// Variantes de status — usando tokens Loumar
const badgeVariants = cva('inline-flex ... rounded-pilula text-[11px] font-bold uppercase', {
  variants: {
    variant: {
      // Prioridade
      'prioridade-baixa':   'bg-[var(--prioridade-baixa-fundo)]  text-[var(--prioridade-baixa-texto)]',
      'prioridade-normal':  'bg-[var(--prioridade-normal-fundo)] text-[var(--prioridade-normal-texto)]',
      'prioridade-alta':    'bg-[var(--prioridade-alta-fundo)]   text-[var(--prioridade-alta-texto)]',
      'prioridade-urgente': 'bg-[var(--prioridade-urgente-fundo)] text-[var(--prioridade-urgente-texto)]',
      // Status de Demanda
      'status-execucao':    'bg-[var(--prioridade-normal-fundo)] text-[var(--prioridade-normal-texto)]',
      'status-aprovacao':   'bg-[var(--chip-aprovacao-fundo)]    text-[var(--chip-aprovacao-texto)]   border border-[var(--chip-aprovacao-borda)]',
      'status-ajustes':     'bg-[var(--prioridade-urgente-fundo)] text-[var(--prioridade-urgente-texto)]',
      'status-concluida':   'bg-[var(--loumar-100)]              text-[var(--loumar-800)]',
      'status-padrao':      'bg-[var(--chip-leitura-fundo)]      text-[var(--chip-leitura-texto)]     border border-[var(--chip-leitura-borda)]',
    },
  },
});
```

Helpers em `features/<fatia>/`:
```ts
// features/demandas/components/BadgePrioridade.tsx
export function BadgePrioridade({ prioridade }: { prioridade: Prioridade }) {
  const map = { Baixa: 'prioridade-baixa', Normal: 'prioridade-normal', ... } as const;
  return <Badge variant={map[prioridade]} className="pointer-events-none">{prioridade}</Badge>;
}
```

---

## 15. Acessibilidade

### 15.1 Princípios

- **WCAG 2.1 AA** como meta mínima.
- Contraste: mínimo 4.5:1 para texto comum, 3:1 para texto grande e ícones interativos.
- Nenhuma informação transmitida **somente** por cor — usar ícone, texto ou padrão adicional.

### 15.2 Foco e teclado

- `:focus-visible` já está configurado globalmente (`globals.css`). Componentes não devem remover outline sem substituição.
- Ordem de tabulação: lógica, seguindo o fluxo visual da página.
- Modais e Sheets devem trapear o foco enquanto abertos (`focus-trap` — Radix faz isso automaticamente nos componentes shadcn).
- Navegação completa por teclado: Tab, Enter, Escape, setas onde aplicável.

### 15.3 Ícones

- Ícones decorativos: `aria-hidden="true"` sempre.
- Ícones funcionais sem texto visível: `aria-label` no elemento pai (Button) ou no próprio SVG.

```tsx
// ✅ Ícone decorativo com texto
<Button><Plus aria-hidden className="h-4 w-4" /> Nova demanda</Button>

// ✅ Ícone funcional sem texto
<Button variant="ghost" size="icon" aria-label="Excluir demanda">
  <Trash2 aria-hidden className="h-4 w-4" />
</Button>

// ❌ Ícone funcional sem label
<Button variant="ghost"><Trash2 className="h-4 w-4" /></Button>
```

### 15.4 Semântica HTML

- Usar elementos nativos corretos: `<button>` para ações, `<a>` para navegação, `<table>` para dados tabulares.
- Listas de navegação: `<ul>` + `<li>` com `<a>` dentro.
- Formulários: `<label>` associado por `htmlFor` / `id` em todos os campos.
- Regiões: `<nav aria-label>`, `<main>`, `<section aria-label>`, `<header>`, `<footer>`.
- **Um único `<main>` por documento**, o do `AppShell` (§5.3).
- **Exatamente um `h1` por destino.** Seções internas usam `h2`/`h3` na ordem, sem pular níveis. Hoje Preferências começa em `h3` e os módulos reservados em `h2`.
- Grupos de botões de escolha (ex.: `StatusControle`) usam espaçamento visual e um `aria-label` no grupo; o texto dos botões não pode sair concatenado ("ConcluídaAjustes solicitados…").
- Pluralização correta em textos e `aria-label` ("2 postagens", não "2 postagems").

### 15.5 Anúncios para leitores de tela

- Avisos de erro de formulário: `role="alert"` (já em uso no `Aviso tipo="erro"`).
- Confirmações de sucesso: `role="status"` ou toast com `aria-live="polite"` (Sonner já faz).
- Contadores e atualizações dinâmicas: `aria-live="polite"` quando relevante.

---

## 16. Responsividade

### 16.1 Breakpoints

| Breakpoint | Largura | Comportamento principal |
|---|---|---|
| — (padrão) | ≥ 1180 px | Sidebar 256 px, padding completo |
| `< 1180 px` | < 1180 px | Menu e padding ligeiramente menores |
| `< 980 px` | < 980 px | Sidebar vira drawer (Sheet) + bottom bar |
| `< 650 px` | < 650 px | Padding de conteúdo reduzido; alguns grids colapsam para 1 coluna |

Os breakpoints do shell são só CSS (`shell.module.css`, `globals.css`), sem detecção em JS. Não criar breakpoints novos fora dessa tabela. Os utilitários `sm:`/`md:` do Tailwind (640/768 px) servem para o conteúdo, não para o shell.

O layout **garante usabilidade a partir de 650 px** (requisito documentado em `docs/design-tokens.md`) e não pode estourar abaixo disso: `document.documentElement.scrollWidth` deve ser igual à largura do viewport em 650 px e em 390 px. Se a tabela tiver mais colunas, ela rola dentro do seu wrapper (§16.3).

980 px é o contrato do shell mobile: 256 px de sidebar + 650 px de conteúdo + padding. Não baixar para 768 px.

### 16.2 Grids de formulário

```tsx
// ✅ Grade responsiva para campos de formulário
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div><Label>Data de aprovação</Label><Input type="date" /></div>
  <div><Label>Data de postagem</Label><Input type="date" /></div>
</div>
```

### 16.3 Tabelas em mobile

Tabelas largas devem ter `overflow-x: auto` no wrapper. **Isso só funciona se todos os ancestrais puderem encolher:** o grid do shell com `minmax(0,1fr)` (§5.1) e todo `flex`/`grid` intermediário com `min-w-0`. Sem isso, o wrapper cresce até a largura da tabela e a página inteira rola, como na auditoria (Usuários a 737 px, Auditoria a 932 px).

```tsx
// ✅ Wrapper que rola sozinho
<div className="min-w-0 overflow-x-auto rounded-card border border-borda-app">
  <table className="w-full min-w-[720px]">…</table>  {/* min-w na TABELA, nunca na página */}
</div>
```

Em mobile, além disso:
- Ocultar colunas menos importantes com `hidden sm:table-cell`.
- Nunca ocultar colunas de status ou ações; a coluna de ações é `sticky right-0` (§10.2).
- Não pôr a tabela dentro de outro `Card` com cabeçalho próprio; o wrapper da tabela já é a superfície.
- Texto longo (detalhes, descrições) truncado com `truncate` precisa de `title` ou tooltip com o conteúdo completo.

### 16.4 Tipografia

Não usar tamanhos de fonte fixos para títulos — preferir `text-xl` a `text-3xl` e ajustar com `sm:text-2xl` onde necessário. Texto de interface: mínimo `text-xs` (12 px) para legibilidade.

---

## 17. Animações e movimento

### 17.1 Tailwind transitions

```tsx
// Transição de hover em cards e linhas de tabela
className="transition-colors duration-150 ease-in-out"

// Recolhimento da sidebar
className="transition-[width] duration-300 ease-in-out"
```

### 17.2 `prefers-reduced-motion`

O `globals.css` já zera `animation-duration` e `transition-duration` globalmente quando `prefers-reduced-motion: reduce` está ativo. **Componentes não precisam repetir esta regra** — ela é herdada automaticamente.

Exceção: se um componente usar `transition` via JavaScript (ex: valores calculados), verificar `window.matchMedia('(prefers-reduced-motion: reduce)')` antes de animar.

### 17.3 Limites

- Duração máxima de transições de layout: 300 ms.
- Sem animações de entrada/saída em listas longas (mais de ~20 itens) — custo de desempenho.
- Spinner de carregamento: `animate-spin` do Tailwind, não animação customizada.
- Sem loops de animação em elementos não-interativos.

---

## 18. Migração das interfaces existentes

### 18.1 Regra geral

As telas construídas antes deste padrão (incluindo `demandas`, `captacoes`, `usuarios`, `pendencias`, `comentarios`, `cortes`) **não são o padrão permanente**. **Todas serão migradas** para seguir as regras deste documento. O projeto está no início; preservar estilos antigos não é objetivo.

A migração é realizada em etapas planejadas. O escopo de cada PR é definido pelo plano de refatoração, não pela quantidade de arquivos tocados. Toda tela deve eventualmente seguir este padrão — não há exceção por "PR cirúrgica".

### 18.2 Rastreamento da migração

O progresso da migração é acompanhado por etapa no plano de execução. Para cada fatia:
- Telas refatoradas: substituir inline styles por Tailwind, componentes legados por shadcn, badges locais por `<Badge>`, estados vazios por `<EstadoVazio>`.
- Tokens inválidos (ex: `--cor-borda` em `usuarios.module.css`): corrigir para tokens Loumar na mesma PR da fatia.
- Enquanto uma fatia ainda não foi migrada, seus arquivos CSS Modules e componentes legados coexistem sem interferência com as fatias já migradas.

### 18.3 O que migrar

| Legado | Novo padrão |
|---|---|
| Inline styles de layout | Classes Tailwind |
| `<Botao>` | `<Button>` (shadcn) |
| `<Campo>` | `<Input>` + `<Label>` (shadcn) |
| `<Cartao>` | `<Card>` (shadcn) |
| `<Aviso tipo="erro">` | `<Alert variant="destructive">` (shadcn) |
| Badge local por fatia | `<Badge>` (shadcn, variante de domínio) |
| `window.confirm()` | `<AlertDialog>` (shadcn) |
| Estado vazio ad hoc | `<EstadoVazio>` (componente compartilhado) |
| Emoji em controles | `<IconeLucide aria-hidden>` |
| `usuarios.module.css` com tokens não-Loumar | Tailwind + tokens corretos |

### 18.4 O que manter

- CSS Modules com tokens Loumar corretos podem coexistir. Restantes em 22/10/2026: `app/(auth)/auth.module.css`, `components/shell/shell.module.css`, `components/ui/ui.module.css` (dos legados de `components/ui/index.tsx`) e `app/tv/tv.css` (fora do escopo). Os das fatias (`cortes`, `captacoes`, `usuarios`, `pendencias`, `comentarios`, `historico`, `midia-movel`) já foram removidos.
- Tokens CSS em `globals.css` — não substituir.
- Lógica de negócio, Server Actions, consultas — fora do escopo de UI.

---

## 19. Checklist para agentes

Antes de abrir PR com mudanças de UI, verificar:

- [ ] Sem valores hex soltos — somente variáveis CSS (`var(--nome)`) ou utilitários Tailwind mapeados para elas
- [ ] Sem inline styles de layout — usar classes Tailwind
- [ ] `<Button>` do shadcn para ações; `<Badge>` para status read-only (sem hover-as-action)
- [ ] Ícones Lucide com `aria-hidden` em decorativos; `aria-label` no pai em funcionais
- [ ] Emoji **não** usados em botões, navegação ou controles de UI
- [ ] Sem `window.confirm()` / `window.alert()` — usar `AlertDialog`
- [ ] Toasts acionados no **cliente**, após receber resultado da Server Action
- [ ] Página não abre `<main>` nem define padding, `max-w-*` ad hoc ou `min-w-[…]` (§5.3)
- [ ] Página tem exatamente um `h1`
- [ ] Sem `scrollWidth` maior que o viewport em 650 px e 390 px
- [ ] Ações de linha em `DropdownMenu`, coluna sticky à direita
- [ ] Rodapé de ações na ordem padrão (§9.1); destrutiva separada
- [ ] Ativar ou limpar filtro não muda o layout da toolbar
- [ ] Nenhum `SelectItem value=""`
- [ ] Todo token de cor usado existe e tem valor no tema escuro
- [ ] Datas em `dd/MM/yyyy`; sem IDs internos, slugs ou UUID visíveis
- [ ] `loading.tsx` criado para rotas com fetch de dados
- [ ] Estado vazio usa `<EstadoVazio>` compartilhado
- [ ] Campos de formulário: `<Label>` associado por `htmlFor`, `aria-label` em campos sem label visível
- [ ] Confirmações destrutivas usam `<AlertDialog>`, não `window.confirm()`
- [ ] Detalhe, cadastro e edição de entidade usam o painel de §13.3, com a rota na URL. Abaixo de 980 px o painel é tela cheia, com cabeçalho e rodapé fixos
- [ ] Formulário alterado pede "Descartar alterações?" antes de fechar. Sucesso recarrega o painel e a lista; exclusão fecha e volta à lista
- [ ] Quadro de Demandas só em `?visao=quadro`. Arraste de status passa por `features/status/` e por `TRANSICOES`
- [ ] Tema escuro verificado visualmente ou por inspeção dos tokens usados
- [ ] Layout testado em 650 px de largura
- [ ] `Button` de carregamento usa `disabled` + spinner — sem double-submit

---

## 20. Living doc

Quando Mateus ou QA reportar um problema recorrente de UI:

1. **Corrigir** o componente ou padrão no código.
2. **Registrar a regra** neste documento, na seção mais próxima do problema — sem aguardar um ticket de documentação.
3. Se o padrão for relevante para agentes, atualizar também `.cursor/rules/ui-standards.mdc`.

A correção sem atualização do padrão é incompleta: o problema volta na próxima fatia construída sem a regra.

---

## 21. Gráficos (ECharts)

Base pronta em `components/charts/`. **Nenhuma tela usa gráficos ainda.** O gráfico de produto entra na fatia dona (Dashboard, Relatório, Ranking) com dados reais da sua `consultas.ts`.

| Arquivo | Papel |
|---|---|
| `echarts.ts` | `echarts/core` com registro modular: Line, Bar, Pie; Grid, Tooltip, Legend, Dataset, Title, Aria; `CanvasRenderer`. Exporta o tipo `OpcoesGrafico`. |
| `tema-loumar.ts` | Monta o tema a partir das CSS vars em tempo de execução (`getComputedStyle`). Sem hex próprio. |
| `Grafico.tsx` | Componente cliente: init/dispose, `ResizeObserver`, troca de tema ao mudar `data-tema`, `prefers-reduced-motion`, `aria`, estado vazio. |
| `index.ts` | Exporta `Grafico` e `OpcoesGrafico`. |

Regras:

- Importar sempre de `@/components/charts`, **nunca** de `echarts` direto. Isso mantém o bundle modular e o tema único.
- Tipo de gráfico ou componente novo (ex.: `ScatterChart`, `DataZoomComponent`) é registrado em `echarts.ts`, nunca na página.
- `Grafico` é `'use client'`. A página (Server Component) busca os dados e passa as opções prontas; não buscar dados dentro do gráfico.
- `rotulo` é obrigatório: vira o `aria-label` do contêiner e a descrição gerada pelo módulo `aria` do ECharts. Ao lado do gráfico, um resumo textual do dado principal.
- Sem dados: passar `vazio` (ou séries vazias) → `EstadoVazio`. Nunca desenhar eixo vazio nem usar dado fictício.
- Cores vêm do tema (`--loumar-*`, `--texto-*`, `--borda-app`). Não passar `color` com hex nas opções.
- Altura explícita (`altura`, padrão 280 px); largura acompanha o contêiner (o contêiner precisa de `min-w-0` dentro de grid ou flex).
- Com `prefers-reduced-motion: reduce`, a animação é desligada.

```tsx
import { Grafico, type OpcoesGrafico } from '@/components/charts';

const opcoes: OpcoesGrafico = {
  dataset: { source: dados },               // dados de consultas.ts
  xAxis: { type: 'category' },
  yAxis: { type: 'value' },
  series: [{ type: 'bar' }],
};

<Grafico opcoes={opcoes} rotulo="Demandas concluídas por semana" vazio={dados.length === 0} />
```

---

## Referências de arquivos

| Arquivo | Conteúdo |
|---|---|
| `app/globals.css` | Tokens CSS de identidade visual e tema |
| `docs/design-tokens.md` | Documentação dos tokens com valores e uso |
| `lib/modules.ts` | Registro de módulos e grupos de navegação |
| `components/shell/AppShell.tsx` | Shell de layout autenticado |
| `components/shell/MenuLateral.tsx` | Sidebar desktop (componente próprio; grupos, ícones, recolhimento) |
| `components/shell/MenuMobile.tsx` | Menu em `Sheet` abaixo de 980 px |
| `components/shell/BottomBar.tsx` | Bottom bar abaixo de 980 px |
| `components/shell/AlternarTema.tsx` | Seletor Claro/Escuro/Sistema (dropdown no topbar) |
| `components/charts/` | Base de gráficos ECharts (§21) |
| `docs/agents/ui-audit.md` | Auditoria de UI de 22/10/2026 (achados e prints) |
| `components/ui/index.tsx` | Componentes base legados (Botao, Campo, Cartao, Aviso) |
| `app/(app)/layout.tsx` | Layout autenticado — onde adicionar `<Toaster>` |
| `app/layout.tsx` | Layout raiz — script de tema (escuro padrão; claro/escuro/sistema) |
| `features/demandas/components/` | Componentes de Demandas |
