# PRD — LouFlow (reescrita fora do Google Apps Script)

> Contrato de produto. Define **o que** cada fase entrega e as regras de negócio que devem ser preservadas. Não é especificação técnica: arquitetura em [`system-design.md`](system-design.md), dados em [`schema-postgres.md`](schema-postgres.md), revisão em [`pr-review-guide.md`](pr-review-guide.md). Vocabulário canônico em [`../CONTEXT.md`](../CONTEXT.md).
>
> Fonte das regras: código de produção obtido via `clasp pull` (21 out 2026) e decisões registradas em [`descoberta-louflow.md`](descoberta-louflow.md) §13.

---

## 1. Problema

O LouFlow roda como Web App do Apps Script com uma planilha Google como banco. O volume atual cabe, mas:

- toda mutação passa por um lock global do documento, o que serializa os 16 usuários;
- cada ciclo de atualização de um Administrador lê de 9 a 10 abas inteiras, e o `Historico` é a primeira aba que vai estourar o tempo limite;
- o backup cria uma aba nova por dia dentro da própria planilha operacional (71 abas acumuladas);
- regras de negócio dependem de nomes próprios gravados no código;
- não há como revisar mudanças por PR, nem existe ambiente de preview.

## 2. Objetivo

Reescrever o LouFlow mantendo **paridade funcional** com a produção atual, num stack revisável por PR e com custo zero sempre que possível.

**Critério de sucesso do lançamento:**

- todos os módulos da §4 funcionando;
- dados da planilha migrados;
- os 16 usuários conseguem entrar após o reset de PIN;
- o Painel de TV exibindo dados reais.

## 3. Princípios de produto

1. **Paridade antes de melhoria.** Comportamento novo só entra se estiver listado aqui.
2. **Lançamento único.** Todos os módulos entram no MVP. As fases definem **ordem de construção**, não lançamentos separados. A virada é *big bang* (P5).
3. **Sem nomes no código.** Toda regra hoje amarrada a uma pessoa vira Permissão ou configuração (D9).
4. **Custo zero no MVP.** Usar o plano gratuito de cada serviço. Custo novo exige aprovação da gerência.
5. **Links continuam links.** Material bruto e Entregas seguem como URLs externas (Drive, WeTransfer). O LouFlow não hospeda arquivos.

## 4. Escopo por fase

### Fase 1 — Núcleo operacional

Ordem de construção: as primeiras dependências ficam no topo.

#### 4.1 Acesso (D3, D4)

- Login com e-mail e PIN de 6 dígitos.
- Bloqueio após **5 tentativas** inválidas, por **15 min**.
- Sessão de **6 h**, renovada a cada uso.
- Dispositivo Confiável de **30 dias**, opcional na hora do login.
- Mudança de Perfil, de Permissões ou de PIN de um Usuário invalida todas as Sessões dele.
- **Reset forçado no lançamento:** nenhum PIN atual é portável, e cada Usuário define um novo PIN no primeiro acesso. O Administrador gera um PIN provisório, entrega pessoalmente, e o Usuário é obrigado a trocá-lo no primeiro login (P1).
- Usuário com Perfil Prêmios só acessa Sorteios.

#### 4.2 Usuários e Permissões

- CRUD de Usuários por quem tem `gerenciarUsuarios`. Cada Usuário tem nome, e-mail, Perfil, vínculo de editor (o nome exibido nas Demandas) e situação ativo/inativo.
- Redefinir PIN de um Usuário.
- Desligar um Usuário: as Demandas dele em execução ou pausadas voltam para Não iniciada, e as que estão em Aprovação são preservadas.
- Permissões granulares. Hoje são **20 chaves** mais a lista de Aprovadores Delegados:

  `criarDemandas`, `definirOutroEditor`, `verTodasDemandas`, `editarDemandas`, `atribuirEditor`, `alterarStatus`, `alterarPrioridade`, `excluirDemandas`, `enviarFicha`, `verAgenda`, `gerenciarAgenda`, `verCaptacoes`, `gerenciarCaptacoes`, `acessarCortes`, `verAbaCortes`, `verRelatorios`, `usarAnalista`, `gerenciarUsuarios`, `verLixeira`, `verSorteios`.
- Administrador tem todas as Permissões. Prêmios tem apenas `verSorteios`.
- Permissões que hoje dependem de nome passam a ser concedidas explicitamente na migração: criar demandas, definir outro editor, acessar cortes e operar drone. Também passa a ser configuração quem é o Editor padrão dos Cortes.

#### 4.3 Demandas

- Quadro com lista, filtro por período, busca, resumo por Editor e destaques ordenados por Prioridade e depois por prazo.
- Criar, editar e excluir (a exclusão manda para a Lixeira), cada ação conforme Permissão.
- Formato, Influencer e Editor vêm de listas configuráveis. Editor "A definir" significa sem Editor.
- Prazo efetivo = data de postagem; na falta dela, a data para aprovação. Uma Demanda fica **atrasada** quando o prazo passou, ela não está em Status Final e não está em Aprovação.
- Uma Demanda **sem Editor** com Formato Ficha técnica entra na Fila de Fichas. Um Editor pode assumi-la.
- Demandas de Formato Cortes recebem automaticamente o Editor padrão de Cortes e **não** podem ser assumidas.
- Atualização em lote de Editor, Status e Prioridade, só para Administrador.

#### 4.4 Máquina de Status (zona protegida)

Status: Não iniciada, Em execução, Pausada, Aprovação, Ajustes solicitados, Concluída, Reprovada, Cancelada.

| Quem | Pode ir para | A partir de |
|---|---|---|
| Editor | Em execução | Não iniciada, Pausada, Reprovada, Ajustes solicitados |
| Editor | Pausada | Em execução |
| Editor | Aprovação | somente ao registrar uma Entrega |
| Administrador | qualquer Status | qualquer Status |

Efeitos obrigatórios de cada transição, todos na mesma unidade atômica:

- **Entrar em Em execução** (vindo de um Status que não seja Em execução nem Pausada) abre um Ciclo de Edição.
- **Entrar em Pausada** abre uma Pausa. **Sair de Pausada** fecha a Pausa.
- **Sair de Em execução ou Pausada** (para qualquer outro Status) fecha o Ciclo e calcula o tempo ativo, que é o tempo total menos as Pausas.
- **Entrar em Concluída** grava a data de conclusão.
- Entregas pendentes são reconciliadas com o novo Status.
- Uma entrada é gravada no Histórico.
- Ação administrativa grava Auditoria Administrativa, com o estado antes e depois.
- **Depois de confirmada a mudança**, a notificação vai por e-mail, conforme as preferências do destinatário. Uma falha de e-mail não desfaz a transição.

O relógio de tempo ativo é exibido em tempo real no cliente.

#### 4.5 Ficha Técnica

- O Influencer envia a ficha com identificação, observação ao editor, previsão de publicação, roteiro, cabeça, sonora, informações, link de arquivos, roteiro escrito, GC/lettering, material em SSD, plataforma, formato do conteúdo, referências visuais e editor sugerido.
- O envio cria uma Demanda com Formato Ficha técnica e Status Não iniciada.
- Editor lê a ficha. Editor fora da Demanda só a vê enquanto ela estiver na Fila de Fichas.

#### 4.6 Entrega e Aprovação

- O Editor registra uma Entrega (link mais observação) com Versão incremental. A Demanda vai para Aprovação.
- Quem avalia: o Influencer da Demanda, um Administrador ou um Aprovador Delegado daquele Editor.
- **Aprovar** leva a Demanda a Concluída e cria um Agendamento Obrigatório para o Influencer.
- **Solicitar ajustes** exige motivo e leva a Demanda a Ajustes solicitados.
- Administrador aprova, mas **não** solicita ajustes. Essa regra está no código atual e deve ser preservada.

#### 4.7 Comentários e Histórico

- Comentários livres por Demanda, exibidos no detalhe dela.
- O Histórico por Demanda é somente leitura.

#### 4.8 Agenda de postagem

- Agendamento de Postagem com Marca, Plataforma, tipo de conteúdo, data e hora. A situação é Agendada, Publicada ou Cancelada.
- Marcas: Loumar, ClickFoz, Apaixonados por Foz, LoumarTV, Ailabiu, Ticket Loko, City Tour.
- Agendar a Demanda aprovada resolve o Agendamento Obrigatório dela.
- Agendamento avulso, sem Demanda, com tipos e plataformas fixos. Ele **não** resolve um Agendamento Obrigatório.

#### 4.9 Pendências do Influencer e Adiamento

- O painel de pendências do Influencer lista as Aprovações e os Agendamentos Obrigatórios em aberto.
- **Na produção, essas pendências não bloqueiam ações no servidor**; a regra está desligada no código. A reescrita preserva esse comportamento (P2).
- O Influencer pode registrar um Adiamento de **5 min a 48 h**, com motivo de **8 a 500 caracteres**.
- Pendência sem resposta nem Adiamento recebe prazo padrão de **24 h**. Vencido o prazo, o Influencer e a administração são avisados por e-mail.
- A verificação roda a cada **15 min** (Fase 1 porque alimenta a Aprovação; o mecanismo está no system design).

#### 4.10 Captação

- Agendar uma Captação com início, fim, videomaker, influencer, cliente, assunto e local.
- Situação: Agendada, Concluída ou Cancelada.
- **Invariante:** um mesmo videomaker não pode ter duas Captações Agendadas com janelas sobrepostas.
- Captação Agendada cujo fim já passou vira **Concluída**, com a data de conclusão igual ao fim previsto. Hoje isso roda a cada 5 min e também em cada leitura.

#### 4.11 Mídia Móvel

- Reservar uma janela de horário com motivo.
- Situação gravada: Reservada, Finalizada ou Cancelada. A tela mostra **Em uso** quando o horário atual cai dentro da janela.
- **Invariante:** não pode haver duas Reservas Reservadas com janelas sobrepostas.
- Reserva cujo fim já passou vira Finalizada, pelo mesmo mecanismo da Captação.
- Só quem fez a Reserva ou um Administrador pode cancelar, e somente uma Reserva que ainda está Reservada.

#### 4.12 Uso de Drone

- Registrar data do uso, responsável, perfil atendido, motivo, local e valor fixo de **R$ 250** por uso.
- Só quem tiver a Permissão de drone opera o módulo. Hoje são duas pessoas, fixadas por nome no código.
- Data futura é rejeitada. Registro duplicado é rejeitado.
- Edição com controle de concorrência otimista: se o registro mudou desde a leitura, a gravação é recusada.
- Cancelar em vez de excluir. Situação: Ativo ou Cancelado.

#### 4.13 Cortes

- O Editor padrão de Cortes cadastra o Corte com tarefa, influencer, data de postagem, Linha Editorial (Viral, Comunidade, Educacional), link do vídeo e Programa de Origem (Destino Iguaçu News, Descubra Foz, Outros).
- Concluir um Corte, e também uma Demanda de Formato Cortes, exige a quantidade produzida, de **1 a 999**.

#### 4.14 Painel de TV (D6)

- Rota pública, sem login, em carrossel.
- Mostra: resumo do mês, Demandas pendentes, Aprovações, Agenda, Captações e Cortes.
- Slide sem conteúdo não entra no ciclo.
- Nunca expõe e-mail, PIN, Sessão nem o conteúdo da Ficha Técnica.
- Atualiza sozinho, sem recarregar a página.

#### 4.15 Lixeira, Auditoria e erros

- Lixeira, para quem tem `verLixeira`: restaurar ou excluir definitivamente.
- Consulta da Auditoria Administrativa.
- Erros do cliente registrados no servidor, sem dados pessoais.

#### 4.16 Notificações por e-mail

- Preferências por Usuário: editor atribuído, mudança de status, novo comentário, solicitação de ajuste, conclusão/aprovação, prazo próximo.
- Alerta diário de prazo às **08:00 (America/Sao_Paulo)** para Demandas a **até 2 dias** do prazo, agrupadas por Editor.
- Provedor de e-mail: Resend (P5). O sistema continua funcionando se a cota de e-mail acabar.

### Fase 2 — Ferramentas de gestão

- **Wiki:** artigos com categoria, título, resumo, conteúdo (até **15 000** caracteres), ordem (**1–999**) e publicado Sim/Não. CRUD e publicação só para Administrador; os demais veem só o que está publicado. Os 7 artigos atuais migram junto.
- **Relatório Diário**, com versão de impressão.
- **Ranking** e produtividade por Editor no período, incluindo o tempo médio de edição a partir dos Ciclos.
- **Analista:** responde perguntas sobre a produção usando **só os dados do LouFlow, sem modelo de linguagem externo**. Pergunta de até **1 200** caracteres e intervalo mínimo de **4 s** por Usuário. Exige `usarAnalista`.
- **Dashboard por Perfil:** Administrador, Editor (incluindo o Aprovador Delegado) e Influencer.

### Fase 3 — Complementares

- **Sorteios:** ganhador, mês, campanha ou programa, prêmio, prazo de retirada, observações e registro de retirada. Exige `verSorteios`.
- **Importação histórica de Sorteios:** os dados da planilha antiga (abas 2024/2025 e 2026) entram **uma única vez** durante a migração. Não haverá uma função permanente no produto para isso (P3).
- **Catálogo de Equipamentos:** referência visual somente leitura.

## 5. Fora de escopo

- Login com Google (OAuth). Fica como adição futura (D3).
- Migração para AWS. Pode acontecer no futuro, com aprovação da gerência (D5).
- Integração com APIs de plataformas de postagem (Instagram, TikTok, YouTube).
- Upload e armazenamento de arquivos de vídeo.
- Backup por cópia de tabela. O backup gerenciado do banco substitui as abas `Backup_*`, e as 71 abas de backup **não** migram.
- Tempo real via WebSocket (D6).
- App mobile nativo.

## 6. Requisitos não funcionais

| Requisito | Alvo |
|---|---|
| Usuários simultâneos | 16 (o atual), com folga para crescer |
| Atualização do quadro | Verificação leve a cada 30 s; recarga completa só quando algo mudou (padrão já usado em produção) |
| Atualização da TV | Dado com no máximo 15 s de defasagem |
| Fuso | Todas as datas exibidas e calculadas em America/Sao_Paulo |
| Dados pessoais | Nenhum PIN legível; nenhum e-mail na TV nem em logs |
| Custo | Plano gratuito de Vercel, Neon, Resend e do agendador externo |

## 7. Decisões (aceitas em 21 out 2026)

Todas as recomendações abaixo foram aceitas e passam a ser requisito.

| # | Questão | Decisão |
|---|---|---|
| P1 | Como cada Usuário recebe o PIN provisório no reset | Administrador gera o PIN provisório e entrega pessoalmente; troca obrigatória no primeiro login |
| P2 | Bloqueio Operacional volta a bloquear no servidor? | Não. Mantém só o painel de pendências mais o aviso à administração, como hoje |
| P3 | Importação histórica de Sorteios é necessária? | Sim, uma única vez, durante a migração de dados |
| P4 | Influencers que constam nas listas mas não têm conta | Migram como Usuário inativo, sem PIN |
| P5 | Inferências D2, D6, D7 e virada *big bang* | Confirmadas: Resend, agendador externo (cron-job.org), TV por polling com cache de 15 s, zonas de revisão e virada *big bang* |
