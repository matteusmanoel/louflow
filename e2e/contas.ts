/** Constantes dos usuários sintéticos. Sem `test()`, para os specs poderem importar. */

export const E2E_ADMIN_EMAIL = 'e2e-admin@exemplo.test';
export const E2E_ADMIN_PIN = '482916';
export const E2E_ADMIN_NAME = 'E2E Admin';
export const AUTH_FILE = 'e2e/.auth/admin.json';
export const AUTH_INFLUENCER = 'e2e/.auth/influencer.json';
export const AUTH_PREMIOS = 'e2e/.auth/premios.json';

export const PERFIS_EXTRA = [
  { email: 'e2e-influencer@exemplo.test', nome: 'E2E Influencer', perfil: 'Influencer', arquivo: AUTH_INFLUENCER },
  { email: 'e2e-premios@exemplo.test', nome: 'E2E Premios', perfil: 'Premios', arquivo: AUTH_PREMIOS },
] as const;
