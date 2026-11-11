-- O guia wiki-08 pedia o Instagram dentro da BM, mas a API só devolve a conta
-- ligada a uma Página atribuída ao usuário do sistema. Com acesso via BM,
-- ads_read e ads_management também são necessários para esse vínculo aparecer.

UPDATE wiki_articles
SET content = $wiki08$O administrador conecta cada Instagram pelo LouFlow. Quem agenda não entra na Meta. Cada Business Manager tem o próprio token. Um token não enxerga as contas de outro.

Antes de abrir a tela, confirme com quem opera a infraestrutura duas coisas: a variável META_TOKEN_KEY está definida no ambiente (mínimo de 32 caracteres) e a rotina POST /api/cron/instagram roda a cada minuto, com o mesmo segredo das outras rotinas. Sem a rotina, o agendamento fica salvo e não sai no horário.

Do lado da Meta, uma vez por empresa:

1. O app é do tipo Business, com o produto Instagram, criado no portfólio da empresa. A verificação da empresa precisa estar concluída para o token sem prazo.
2. Cada Instagram é profissional (Business ou Creator) e está ligado a uma Página do Facebook. Colocar a conta só em Contas do Instagram não basta: a Página precisa ter o Instagram em Contas vinculadas.
3. Se a Página exige autorização de publicação ou verificação em duas etapas, conclua isso antes. Sem isso a sincronização pode aceitar o token e a publicação falhar.

Em cada Business Manager:

1. Abra as configurações do negócio, Usuários, Usuários do sistema, e adicione um usuário do sistema com função de administrador.
2. Atribua a esse usuário o app, a Página com controle total e a conta do Instagram com controle total. A Página é o ativo que a sincronização lê.
3. Gere um token novo para o app, sem data de expiração, com instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement, business_management, ads_read e ads_management. As duas últimas são obrigatórias quando a Página foi entregue pelo Business Manager. Um token antigo não recebe permissão nova.
4. Copie o token na hora. A Meta não mostra de novo. Não cole o token na Wiki, em e-mail ou em comentário.

No LouFlow, em Administração, Instagram:

1. Cadastre um Business Manager com o nome que a equipe reconhece. Um registro por BM.
2. Cole o token e salve. O estado passa a Aguardando sincronização. O Ok anterior sai até a nova sincronização.
3. Sincronize. Token válido significa que a Meta aceitou a credencial. Ok em cada @ significa que a conta pode receber agendamento.
4. Agende título, conta, formato, marca, legenda, URL pública da mídia e horário de Brasília.

Formatos desta operação: foto (JPEG), Reel (MP4) e Story (JPEG ou MP4). A URL precisa abrir sem login. O LouFlow só envia o arquivo na hora marcada, porque o material preparado na Meta expira em 24 horas. Carrossel fica para uma etapa seguinte.

Se o token é válido e nenhuma conta aparece, a Página não está no usuário do sistema, o Instagram não está vinculado a essa Página, ou o token não tem ads_read e ads_management. Gere outro token depois de corrigir e cole de novo. Se a conta fica Ausente depois de sincronizar, o ativo saiu do usuário do sistema.

A publicação sai em nome do Instagram profissional, não do usuário do LouFlow.$wiki08$,
    updated_at = now()
WHERE id = 'wiki-08';
