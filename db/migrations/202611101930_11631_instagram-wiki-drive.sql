-- O agendamento deixa de pedir URL pública e passa a usar um arquivo do Drive.

UPDATE wiki_articles
SET content = replace(
      replace(
        content,
        'URL pública da mídia',
        'arquivo do Drive'
      ),
      'A URL precisa abrir sem login. O LouFlow só envia o arquivo na hora marcada',
      'Escolha um arquivo do Drive ou envie um novo para a pasta aberta no seletor. O LouFlow só envia o arquivo na hora marcada'
    ),
    updated_at = now()
WHERE id = 'wiki-08'
  AND content LIKE '%URL pública da mídia%';
