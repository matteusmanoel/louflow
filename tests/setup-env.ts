process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? 'postgres://louflow:louflow@localhost:54329/louflow_test';
process.env.PIN_PEPPER = 'pepper-de-teste-com-mais-de-32-caracteres-0001';
process.env.CRON_SECRET = 'segredo-de-teste';
process.env.META_TOKEN_KEY = 'chave-de-teste-meta-com-32-caracteres';
delete process.env.UAZAPI_BASE_URL;
delete process.env.UAZAPI_TOKEN;
delete process.env.UAZAPI_DESTINO;
delete process.env.UAZAPI_GRUPO_LIBERADO;
