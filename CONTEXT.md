# LouFlow

Sistema interno de gestão da produção de conteúdo audiovisual do time de marketing da Loumar: da solicitação de um vídeo pelo influencer até a postagem, passando por edição, aprovação e agenda, além dos recursos operacionais que o time compartilha.

## Language

### Pessoas e acesso

**Usuário**:
Pessoa com conta no LouFlow, identificada por e-mail e com exatamente um Perfil.
_Avoid_: Membro, conta, login

**Perfil**:
Papel base de um Usuário que define suas Permissões padrão: Administrador, Editor, Influencer ou Prêmios.
_Avoid_: Role, tipo de usuário, cargo

**Administrador**:
Perfil com todas as Permissões, que decide transições de Status fora do fluxo do Editor e governa Usuários.
_Avoid_: Admin, gestor, superusuário

**Editor**:
Perfil de quem executa a edição de uma Demanda; videomakers também usam este Perfil.
_Avoid_: Editor de vídeo, executor, freelancer

**Influencer**:
Perfil de quem solicita conteúdo, preenche a Ficha Técnica, aprova Entregas e agenda a postagem.
_Avoid_: Criador, cliente, apresentador

**Prêmios**:
Perfil restrito que só enxerga e opera Sorteios.
_Avoid_: Perfil de sorteio, usuário externo

**Permissão**:
Capacidade nomeada concedida a um Usuário além ou aquém do padrão do seu Perfil.
_Avoid_: Acesso, privilégio, flag

**Aprovador Delegado**:
Usuário não Administrador autorizado a avaliar Entregas de Editores específicos.
_Avoid_: Revisor, aprovador substituto

**PIN**:
Código numérico de 6 dígitos que, junto com o e-mail, autentica um Usuário.
_Avoid_: Senha, código de acesso

**Sessão**:
Período autenticado de um Usuário, encerrado por inatividade, saída ou mudança de acesso.
_Avoid_: Login, token

**Dispositivo Confiável**:
Navegador que o Usuário marcou para retomar a Sessão sem digitar o PIN por um período longo.
_Avoid_: Lembrar-me, dispositivo salvo

### Produção

**Demanda**:
Pedido de um conteúdo a ser produzido, com Influencer, Editor, Formato, Prioridade, Status e prazos.
_Avoid_: Tarefa, job, ticket, pedido

**Formato**:
Tipo de peça que a Demanda produz; o Formato "Ficha técnica" indica que a Demanda nasce de uma Ficha Técnica.
_Avoid_: Tipo, categoria

**Prioridade**:
Urgência relativa de uma Demanda: Baixa, Normal, Alta ou Urgente.
_Avoid_: Peso, criticidade

**Status**:
Etapa do ciclo de vida da Demanda: Não iniciada, Em execução, Pausada, Aprovação, Ajustes solicitados, Concluída, Reprovada ou Cancelada.
_Avoid_: Estado, situação, fase

**Status Final**:
Status que encerra a Demanda: Concluída, Cancelada ou Reprovada.
_Avoid_: Fechada, arquivada

**Ficha Técnica**:
Briefing estruturado que o Influencer envia com roteiro, referências e links do material bruto para orientar a edição.
_Avoid_: Briefing, formulário, roteiro

**Fila de Fichas**:
Conjunto de Demandas criadas a partir de Ficha Técnica que ainda não têm Editor e podem ser assumidas por um Editor.
_Avoid_: Backlog, pool

**Ciclo de Edição**:
Intervalo contínuo de trabalho de um Editor numa Versão da Demanda, do início da execução até a Entrega ou interrupção.
_Avoid_: Sessão de edição, sprint, timer

**Pausa**:
Interrupção registrada de uma Demanda em execução, cujo tempo é descontado do tempo ativo do Ciclo de Edição.
_Avoid_: Parada, suspensão

**Entrega**:
Versão numerada do conteúdo editado, enviada como link pelo Editor para avaliação.
_Avoid_: Upload, submissão, envio

**Aprovação**:
Avaliação de uma Entrega que resulta em aprovada (conclui a Demanda) ou em Ajustes solicitados.
_Avoid_: Revisão, validação, feedback

**Versão**:
Número sequencial de uma Entrega dentro da mesma Demanda; cada pedido de ajuste leva a uma nova Versão.
_Avoid_: Revisão, iteração, take

**Comentário**:
Mensagem livre de um Usuário associada a uma Demanda.
_Avoid_: Nota, chat, observação

**Histórico**:
Registro cronológico das ações ocorridas numa Demanda.
_Avoid_: Log, timeline

**Lixeira**:
Lugar onde a Demanda excluída fica guardada até ser restaurada ou excluída definitivamente.
_Avoid_: Arquivo, excluídos

### Postagem

**Agendamento de Postagem**:
Data, hora, Plataforma e Marca em que um conteúdo será publicado, com situação Agendada, Publicada ou Cancelada.
_Avoid_: Post, publicação, calendário

**Agendamento Obrigatório**:
Pendência criada para o Influencer quando uma Entrega é aprovada, resolvida só ao agendar a postagem daquela Demanda.
_Avoid_: Agendamento pendente, tarefa de postagem

**Marca**:
Perfil ou canal da Loumar em nome do qual o conteúdo é publicado.
_Avoid_: Cliente, página, conta

**Bloqueio Operacional**:
Condição de um Influencer com Aprovação ou Agendamento Obrigatório em aberto, que ele deve resolver ou adiar antes que a administração seja avisada.
_Avoid_: Trava, restrição, pendências

**Adiamento**:
Prorrogação responsável e justificada, feita pelo Influencer, do prazo de uma pendência que causa Bloqueio Operacional.
_Avoid_: Soneca, snooze, postergação

### Recursos operacionais

**Captação**:
Saída de campo agendada de um videomaker para gravar material bruto, com cliente, assunto, local e janela de horário.
_Avoid_: Gravação, filmagem, externa

**Mídia Móvel**:
Veículo compartilhado de produção externa que precisa ser reservado.
_Avoid_: Van, carro, veículo

**Reserva de Mídia Móvel**:
Bloqueio de uma janela de horário da Mídia Móvel para um uso específico.
_Avoid_: Agendamento de carro, booking

**Uso de Drone**:
Registro de cada operação do drone com responsável, perfil atendido, motivo, local e valor fixo por uso.
_Avoid_: Voo, reserva de drone

**Corte**:
Trecho curto derivado de um vídeo longo de um Programa de origem, produzido em quantidade a partir de um mesmo material.
_Avoid_: Clip, recorte, short

**Linha Editorial**:
Intenção do conteúdo de um Corte ou Demanda: Viral, Comunidade ou Educacional.
_Avoid_: Pilar, categoria de conteúdo

**Programa de Origem**:
Programa recorrente do qual os Cortes são extraídos.
_Avoid_: Fonte, série

**Sorteio**:
Registro de um ganhador de uma campanha, com prêmio, prazo e confirmação de retirada.
_Avoid_: Promoção, giveaway, prêmio

**Wiki**:
Conjunto de artigos de regras operacionais do time, publicados ou ocultos por um Administrador.
_Avoid_: Regras, manual, guia, documentação

**Catálogo de Equipamentos**:
Referência visual dos equipamentos fotográficos disponíveis ao time.
_Avoid_: Inventário, estoque

### Acompanhamento

**Ranking**:
Classificação de Editores por produção concluída num período.
_Avoid_: Placar, leaderboard

**Relatório Diário**:
Resumo imprimível da produção e das pendências de um dia.
_Avoid_: Report, dashboard

**Analista**:
Assistente de perguntas sobre a produção que responde com base nos dados do próprio LouFlow.
_Avoid_: IA, chatbot, assistente virtual

**Painel de TV**:
Visão pública, em carrossel e sem login, da produção do time, exibida numa TV do escritório.
_Avoid_: Dashboard, telão, monitor

**Auditoria Administrativa**:
Registro de ações administrativas com o estado antes e depois da alteração.
_Avoid_: Log de admin, histórico de admin
