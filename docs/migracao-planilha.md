# Migração da planilha para o Postgres

Runbook da carga única descrita em `docs/system-design.md` §12 e no mapa aba → tabela de `docs/schema-postgres.md` §8. Este documento não importa nada. O export fica fora do git, o ensaio roda num branch Neon descartável, e o importador só é escrito quando o xlsx de produção estiver disponível para conferir os cabeçalhos reais.

## O que não entra

- As 71 abas `Backup_*`.
- PIN da planilha. Todo usuário importado fica com `pin_hash` nulo e `must_reset_pin = true`.
- `Concluidos` e `Ranking`. São consultas, não tabelas.
- `session_tokens` e `trusted_devices`. Nascem no LouFlow, não na planilha.
- Contas `@exemplo.test`. O seed sintético não roda no endpoint de produção.

## Ordem

1. `Usuarios` e `Permissoes_Usuarios`.
2. `Listas`.
3. `Base_Demandas`.
4. `Fichas_Tecnicas`, `Entregas`, `Ciclos_Edicao`, `Pausas_Demandas`.
5. `Comentarios` e `Historico`.
6. `Agendamentos_Postagem`, `Agendamentos_Obrigatorios`, `Adiamentos_Influencer`.
7. `Captacoes` e `Reservas_Midia_Movel`.
8. `Uso_Drone` e `Cortes`.
9. `Regras_Wiki` e `Sorteios_Premios`.
10. `Lixeira_Demandas`, `Registro_Erros`, `Auditoria_Administrativa`.
11. `Preferencias_Notificacao`, sem sobrescrever o horário do resumo já gravado em `notification_settings` (10h).

A leitura é por nome de cabeçalho. Índice de coluna não vale: a planilha de produção tem colunas a mais que o código local.

## Abortar a carga

A transação inteira desfaz. Nada é descartado em silêncio.

- Status, prioridade ou situação fora do conjunto canônico do schema.
- Identificador de demanda que não esteja no formato já usado (`LF` + hexadecimal). Os que estão nesse formato são preservados.
- E-mail duplicado ou e-mail que não fecha com a conta resolvida na primeira etapa.
- `completed_at` preenchido com status diferente de `Concluída`, ou status `Concluída` sem `completed_at`. O banco recusa os dois.
- Sobreposição de captação ou de reserva. O `EXCLUDE` (`captures_videomaker_id_tstzrange_excl`, `media_reservations_tstzrange_excl`) aborta; não há varredura prévia.
- Cabeçalho obrigatório ausente na aba.

`editor_id` vazio continua nulo. Na interface isso é "A definir". A importação não inventa editor.

## Pessoas e permissões

- E-mail existente vira a conta. Nome de editor ou influencer sem conta vira usuário inativo, sem PIN e sem WhatsApp inventado.
- Permissão que a planilha amarrava a um nome vira linha em `user_permissions` ou delegação em `approval_delegations`.
- WhatsApp só entra se casar com `^55[0-9]{10,11}$`. Valor fora disso aborta a linha em vez de gravar um número inválido.

## Ensaio

1. Exportar a planilha fora do repositório.
2. Criar um branch Neon descartável a partir do schema já migrado. Não usar o endpoint de produção neste passo.
3. Carregar o export nesse branch.
4. Contar cada aba contra a tabela correspondente e guardar o relatório. A virada só segue se as contagens fecharem e se uma demanda conhecida (sem dado pessoal no relatório) aparecer com o mesmo id, status e editor nulo quando a planilha o deixa vazio.
5. Apagar o branch de ensaio.

## Virada

1. Congelar a planilha em somente leitura.
2. Aplicar as migrations pendentes no Neon de produção com `DATABASE_URL_UNPOOLED`, antes do deploy. Sem seed.
3. Importar uma vez, na ordem acima, dentro de transação.
4. Repetir a contagem aba versus tabela no banco de produção.
5. Trocar o link de acesso para a URL pública de produção.
6. Apagar o export.

O aviso das 7h30 continua em `scripts/virada/avisar-acesso.ts`. Ele só roda depois da importação, com `VIRADA_CONFIRMADA=sim` e `--enviar`, e só manda mensagem privada para usuário ativo importado que ainda não tem PIN. Sem esses dois, o script apenas conta. Esta etapa não dispara esse envio.
