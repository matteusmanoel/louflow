# Design Tokens — LouFlow

> Extraído de `demandas-edits/Estilos.html`, `EstilosTv.html` e `EstilosImpressao.html` de **produção** (`clasp pull`, 21 out 2026). **Não inventar identidade nova:** a reescrita reproduz o que já está em uso. Mudança visual exige pedido explícito e vira PR próprio.

## 0. Qual camada vale

`Estilos.html` tem 7 057 linhas, com três camadas empilhadas. Pela cascata, **só a última define a aparência atual**:

| Camada | Linhas | Situação |
|---|---|---|
| Base original: azul `#101fe8`, cinzas Google, Arial | 1 a ~2380 | **Legado.** Continuam valendo apenas os badges de Prioridade e os estados de linha (§3.3), que nenhuma camada posterior sobrescreve |
| "Tema iOS / Liquid Glass": `--ios-*`, vidro com `backdrop-filter` | ~2382 a ~3676 | **Legado.** Sobrescrita pela identidade Loumar. Não portar |
| **"Identidade Loumar"**: `--loumar-*`, menu lateral | ~3677 (escuro) e ~4393 em diante | **Vigente.** Cores e layout destes tokens. Tipografia atual: Inter, Manrope e Fraunces (§4) |

## 1. Cores — interface principal

### 1.1 Escala da marca

| Token | Valor | Uso observado |
|---|---|---|
| `loumar-950` | `#00283d` | Fim do gradiente do menu lateral |
| `loumar-900` | `#003b59` | Início do gradiente do menu; texto de botão secundário |
| `loumar-800` | `#075577` | Início do gradiente do botão principal; texto de botão neutro |
| `loumar-700` | `#0875a8` | Links, aba ativa do modal, rótulos de destaque, borda do botão principal |
| `loumar-600` | `#0b8dca` | Fim do gradiente do botão principal; borda de foco |
| `loumar-100` | `#dff3fb` | Hover de superfícies claras |
| `loumar-50` | `#f2f9fc` | Fundo de botões e realces suaves |

### 1.2 Superfícies e texto

| Token | Claro | Escuro (`data-tema="escuro"`) |
|---|---|---|
| `superficie` | `#ffffff` | `#102733` |
| `fundo-app` | `#eef3f6` | `#071922` |
| `borda-app` | `#dce5ea` | `#294654` |
| `texto-forte` | `#183143` | `#edf7fb` |
| `texto-suave` | `#667985` | `#9fb6c2` |
| `loumar-50` | `#f2f9fc` | `#122f3d` |
| `loumar-100` | `#dff3fb` | `#163c4c` |

No tema escuro, o fundo da página leva dois halos radiais da marca, `rgba(11,141,202,.14)` e `rgba(7,85,119,.16)`, sobre `#071922`.

### 1.3 Tabelas e modais

| Elemento | Valor |
|---|---|
| Cabeçalho de tabela (fundo) | `#f2f6f8` |
| Cabeçalho de tabela (texto) | `#5d7280`, 10 px, caixa alta, `letter-spacing .045em` |
| Borda do cabeçalho | `#d7e1e7` |
| Borda de linha | `#e6edf1` |
| Hover de linha | `#f7fbfd` |
| Overlay de modal | `rgba(0,35,53,.54)` + `blur(4px)` |

## 2. Tema escuro

- Preferência salva no navegador, chave `louFlowTema` = `claro` | `escuro` | `sistema`. O script de `app/layout.tsx` grava `data-tema="claro"` ou `data-tema="escuro"` em `<html>` antes da pintura.
- O padrão, sem nada salvo, é **escuro**. `sistema` segue `prefers-color-scheme` em tempo real.
- Todo token de cor tem valor nos dois temas. Os semânticos abaixo (prioridade, chip, linha) também.
- Na impressão, o tema escuro é forçado para claro.

## 3. Cores semânticas

### 3.1 Prioridade (badge em pílula, 11 px, 800, caixa alta)

| Prioridade | Fundo claro | Texto claro | Fundo escuro | Texto escuro |
|---|---|---|---|---|
| Baixa | `#e8f0fe` | `#174ea6` | `#16324d` | `#c5dcff` |
| Normal | `#e6f4ea` | `#137333` | `#143528` | `#9ee7b4` |
| Alta | `#fef7e0` | `#b06000` | `#3a2c12` | `#ffe08a` |
| Urgente | `#fce8e6` | `#c5221f` | `#3d1c1a` | `#ffb4ae` |

Contraste de texto sobre fundo acima de 4.5:1 nos dois temas. No escuro, `--destructive-foreground` é `#3b1210` (texto escuro sobre `#ff8a80`); no claro continua `#ffffff` sobre `#c61f17`.

### 3.2 Status e situações

| Elemento | Fundo claro | Texto claro | Borda clara | Fundo escuro | Texto escuro | Borda escura |
|---|---|---|---|---|---|---|
| Aguardando aprovação (chip) | `#fff8dc` | `#875700` | `#eac666` | `#3a3014` | `#ffe08a` | `#d4b46a` |
| Somente leitura (chip) | `#f6f9fc` | `#42566f` | `#d6e0ec` | `#1c3344` | `#d5e6f0` | `#6f8eaa` |
| Captação Agendada | `#eaf3ff` | `#075dbb` | — | — | — | — |
| Captação Concluída | `#dcfce7` | `#166534` | — | — | — | — |
| Captação Cancelada | `#eef2f7` | `#64748b` | — | — | — | — |
| Corte Em andamento | `#fff3cd` | `#92400e` | — | — | — | — |
| Corte Concluído | `#dcfce7` | `#166534` | — | — | — | — |

### 3.3 Estados de linha de Demanda

| Estado | Claro | Escuro |
|---|---|---|
| Linha atrasada (fundo) | `#fff1f1` | `#3d1c1a` |
| Rótulo "atrasado" | `#c5221f`, 11 px, 700 | `#ffb4ae` |
| Linha com prazo próximo (fundo) | `#fff8e1` | `#3a2c12` |
| Rótulo de prazo | `#b06000`, 10 px, 800 | `#ffe08a` |

### 3.4 Alertas de prazo (dashboard)

Cartão com borda esquerda de 5 px na cor do alerta:

| Nível | Cor | Fundo claro | Cor no escuro | Fundo escuro |
|---|---|---|---|---|
| Atrasada | `#c61f17` | `#fff7f6` | `#ff8a80` | `#302225` |
| Hoje | `#d9480f` | `#fff7ed` | `#ffad72` | `#30271f` |
| Amanhã | `#b45309` | `#fffaeb` | `#ffd166` | `#142a34` |
| Em 2 dias | `#92620a` | `#fffdf3` | `#ffd166` | `#142a34` |

### 3.5 Cor de identificação de Captação

A Captação é marcada com uma borda esquerda de 6 px. Paleta: azul `#0a7cff`, roxo `#8b5cf6`, rosa `#ec4899`, laranja `#f59e0b`, verde `#10a56b`, vermelho `#ef4444`.

## 4. Tipografia — interface principal

- Texto corrido: **Inter** (`--fonte`). Interface (menu, botões, rótulos, badges): **Manrope** (`--fonte-ui`).
- Títulos (`h1`–`h4`, `.fonte-titulo`), números e caracteres de destaque (`.fonte-numero`): **Fraunces** (`--fonte-display`). O `h1` usa o eixo WONK.
- Carregadas com `next/font` em `app/fontes.ts`. O Painel de TV mantém a família própria de `app/tv/tv.css`.
- Escala real em uso, por frequência: **11 px e 12 px** (dominantes), 13 px, 10 px, 14 px; títulos em 17, 18, 20, 24 e 28 px. Título do login: 32 px.
- Pesos usados: 400, 700, 750 e 800. O peso 900 aparece só em ícones de sinal.
- Rótulos de marca e seção: 11 px, 800, caixa alta, `letter-spacing .15em`, cor `loumar-700`.

## 5. Forma, profundidade e layout

### 5.1 Raio

| Elemento | Raio |
|---|---|
| Botão principal | 9 px |
| Botão neutro | 8 px |
| Input do login | 10 px |
| Card, tabela, painel de notificações | 12 px |
| Painel | 14 px |
| Modal | 16 px |
| Card de login | 20 px |
| Badge e chip | 999 px (pílula) |

### 5.2 Sombra

| Elemento | Valor |
|---|---|
| Botão principal | `0 6px 16px rgba(0,91,132,.16)` |
| Card | `0 4px 16px rgba(0,53,79,.045)` |
| Painel | `0 8px 26px rgba(0,53,79,.06)` |
| Topo | `0 3px 16px rgba(0,52,78,.05)` |
| Menu lateral | `8px 0 28px rgba(0,33,50,.12)` |
| Modal | `0 30px 90px rgba(0,35,53,.25)` |
| Login | `0 24px 70px rgba(0,48,73,.18)` |
| Anel de foco | `0 0 0 3px rgba(11,141,202,.12)` + borda `loumar-600` |

### 5.3 Botões

| Tipo | Estilo |
|---|---|
| Principal | Gradiente `135deg` de `loumar-800` a `loumar-600`, texto branco, borda `loumar-700`; no hover, `brightness(1.04)` |
| Neutro | Fundo branco, borda `borda-app`, texto `loumar-800` |

### 5.4 Layout

| Token | Valor |
|---|---|
| `menu-largura` | 256 px (232 px abaixo de 1180 px) |
| `menu-recolhido` | 82 px |
| `topo-altura` | 76 px |
| Padding do conteúdo | 24 px abaixo de 1180 px |
| Grade | `menu \| topo` sobre `menu \| conteudo` |

Breakpoints principais: **1180 px** (menu mais estreito), **980 px** (o menu sai da grade) e **650 px** (layout de celular). Também existe uma regra `prefers-reduced-motion: reduce`, que deve ser preservada.

## 6. Painel de TV

Identidade **separada** da interface principal, de propósito. Fundo escuro fixo, sem tema claro.

| Token | Valor |
|---|---|
| `navy` | `#2E5488` |
| `teal` | `#35B39F` |
| `amber` | `#E3B579` |
| `coral` | `#EA7A61` |
| `violet` | `#8B7FD4` |
| `bg` | `#0A0F18` |
| `card` | `#131B29` |
| `surface` | `#1B2534` |
| `ink` | `#EEF1F5` |
| `ink-soft` | `#A6AFBD` |
| `ink-faint` | `#5E6879` |
| `line` | `#232E42` |
| Fundo do contêiner (shell) | `#070d18` |

- Fontes web:
  - Corpo: Inter (400, 500, 600, 700, 800), com `-apple-system, BlinkMacSystemFont, sans-serif` como fallback.
  - Títulos e números: Fraunces, `opsz 9..144`, pesos 500, 600 e 700.
- Escala fluida: **tudo em `clamp()` com `vw`/`vh`**, para a mesma folha servir de notebook a TV 4K. Exemplos:
  - número de destaque: `clamp(60px, 8vw, 150px)`;
  - título de slide: `clamp(22px, 2.2vw, 40px)`;
  - texto: `clamp(13px, 1.2vw, 22px)`;
  - legenda: `clamp(10px, .8vw, 14px)`;
  - padding da página: `clamp(24px, 2.6vw, 56px)`.
- Raio: 24 px nos cards e 100 px nas pílulas.

## 7. Impressão

- `@page { size: A4 portrait; margin: 10mm; }`
- Escala em `pt`: corpo de 6,5 a 7 pt; títulos de 11, 15 e 19 pt.
- A impressão esconde menu, topo, modais, toasts e filtros, força fundo branco e texto `#111827`, e anula o tema escuro.
- Modos de impressão atuais: ranking, completo e cortes.

## 8. Ativos

- Logo Loumar: hoje é um PNG em base64 embutido em `LogoLoumar.html`. Na reescrita, vira arquivo em `public/`, com largura de 210 px no login e 150 px no menu.
- Catálogo de Equipamentos: o JSON de `CatalogoEquipamentosFotos.html` vira um arquivo estático.

## 9. Regras para quem implementa

1. Os tokens viram variáveis CSS num único arquivo global, com os nomes desta página. Componentes **não** usam hex soltos.
2. O tema escuro troca só variáveis. Nenhum componente deve ter dois conjuntos de cores fixos no código.
3. O Painel de TV tem folha e tokens próprios e não importa os tokens da interface principal.
4. Os badges de Prioridade e Status são componentes únicos, reaproveitados no quadro, no dashboard e no detalhe.
