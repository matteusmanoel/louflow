-- 202610230800_11596_tv-nota-informativa: designação de nota informativa no ranking da TV.
-- Quem a tem aparece no rodapé e não disputa. Substitui o nome fixo do protótipo.
-- Não edita 0001: solta o CHECK antigo e recria com a chave nova.

DO $$
DECLARE
  nome text;
BEGIN
  SELECT con.conname INTO nome
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'user_permissions'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%permission_key%';

  IF nome IS NOT NULL THEN
    EXECUTE format('ALTER TABLE user_permissions DROP CONSTRAINT %I', nome);
  END IF;
END $$;

ALTER TABLE user_permissions ADD CONSTRAINT user_permissions_permission_key_check
  CHECK (permission_key IN (
    'criarDemandas','definirOutroEditor','verTodasDemandas','editarDemandas',
    'atribuirEditor','alterarStatus','alterarPrioridade','excluirDemandas',
    'enviarFicha','verAgenda','gerenciarAgenda','verCaptacoes','gerenciarCaptacoes',
    'acessarCortes','verAbaCortes','verRelatorios','usarAnalista','gerenciarUsuarios',
    'verLixeira','verSorteios',
    'operarDrone','editorPadraoCortes','notaInformativaRanking'
  ));
