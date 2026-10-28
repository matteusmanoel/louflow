-- 202610281930_11605_wiki-seed: artigos operacionais iniciais da Wiki (S2-01).
-- A tabela wiki_articles já existe em 0001_init. Este arquivo só insere o conteúdo.
-- ON CONFLICT mantém a migration idempotente sem sobrescrever edições posteriores.

INSERT INTO wiki_articles (id, category, title, summary, content, position, is_published, updated_by)
VALUES
  (
    'wiki-01',
    'Comece aqui',
    'Como usar este guia',
    'Visão geral das rotinas e dos combinados registrados no LouFlow.',
    $wiki01$Este é o guia operacional inicial do LouFlow. Ele reúne os fluxos que já usamos no sistema e pode ser atualizado pelos administradores.

Cada demanda deve ter as informações necessárias para a próxima pessoa executar seu trabalho. Antes de avançar uma etapa, confira os dados, o material e o responsável.

Se uma situação não estiver coberta aqui, alinhe com a administração antes de tratar uma orientação informal como regra oficial.$wiki01$,
    1,
    true,
    NULL
  ),
  (
    'wiki-02',
    'Demandas',
    'Fichas técnicas e materiais',
    'O briefing e os links precisam estar corretos e acessíveis.',
    $wiki02$Ao enviar uma ficha, preencha as informações necessárias para o editor entender o objetivo, o formato, o prazo e o material. Confira os links antes do envio.

Quando uma demanda depender de um estilo ou contexto específico, use a sugestão de editor na ficha; a definição final continua com quem gerencia a distribuição.

Se um link ou informação mudar depois da atribuição, atualize a ficha no LouFlow e avise o responsável.$wiki02$,
    2,
    true,
    NULL
  ),
  (
    'wiki-03',
    'Demandas',
    'Edição, pausas e versões',
    'Registre o tempo de trabalho de cada versão com precisão.',
    $wiki03$Inicie a edição quando começar a trabalhar na demanda. Pause quando interromper o trabalho e retome ao voltar.

Ao enviar a primeira versão para aprovação, o tempo ativo daquela versão é encerrado. O período aguardando aprovação não conta como edição.

Se forem solicitados ajustes, inicie a edição da nova versão e envie novamente quando terminar. Cada versão mantém seu próprio tempo de trabalho.$wiki03$,
    3,
    true,
    NULL
  ),
  (
    'wiki-04',
    'Aprovação',
    'Revisão e aprovação',
    'Aprovações devem refletir a versão realmente conferida.',
    $wiki04$Abra a versão enviada e revise o material antes de aprovar ou pedir ajustes. Registre retornos de forma clara para que o editor saiba o que precisa mudar.

Quando o fluxo exigir agendamento para liberar a próxima ação do influencer, agende a publicação no LouFlow após aprovar.

A aprovação delegada segue as permissões configuradas pela administração.$wiki04$,
    4,
    true,
    NULL
  ),
  (
    'wiki-05',
    'Publicação',
    'Agenda editorial',
    'Organize plataforma, marca e horário antes da publicação.',
    $wiki05$No agendamento, selecione a marca principal, a plataforma e a data e hora. A agenda também aceita posts cadastrados manualmente, além de demandas concluídas. Verifique se não está criando uma reserva duplicada.

Se a publicação precisar ser adiada, o responsável pelo agendamento ou um administrador pode ajustar a data no LouFlow.$wiki05$,
    5,
    true,
    NULL
  ),
  (
    'wiki-06',
    'Produção',
    'Cortes',
    'Uma produção de cortes é uma demanda, mesmo com várias peças.',
    $wiki06$Na área de Cortes, registre a data da produção e use iniciar, pausar, retomar e concluir conforme o trabalho acontece.

Ao concluir, informe quantos cortes foram produzidos. A quantidade ajuda a analisar a entrega, mas a produção conta como uma demanda no ranking.$wiki06$,
    6,
    true,
    NULL
  ),
  (
    'wiki-07',
    'Recursos',
    'Mídia Móvel',
    'Reserve o carro com período e motivo de uso.',
    $wiki07$Antes de usar o carro, registre a reserva de Mídia Móvel com data, horários de início e fim e motivo.

Confira as reservas existentes: o LouFlow impede dois agendamentos no mesmo intervalo. Se o plano mudar, atualize a equipe e cancele a reserva que não será utilizada.

Confira sempre o nível de combustível antes de usar o veículo. Mesmo que tenha recebido o carro na reserva, não o devolva na mesma condição: providencie o abastecimento conforme o procedimento da empresa. A responsabilidade pela conferência e pela entrega cabe a quem utilizou o veículo por último.$wiki07$,
    7,
    true,
    NULL
  )
ON CONFLICT (id) DO NOTHING;
