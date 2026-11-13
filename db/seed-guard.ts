/**
 * Guard do seed: decide se o seed sintético pode rodar contra a DATABASE_URL.
 * - localhost/127.0.0.1: sempre permitido.
 * - host remoto: só com SEED_ALLOW_REMOTE=1 E host exato listado em SEED_REMOTE_HOSTS (vírgulas).
 * - endpoint da produção (Neon main) é recusado SEMPRE, mesmo que esteja na lista.
 * Nunca inclui usuário, senha ou URL nas mensagens de erro.
 */

/** Endpoints Neon de produção (branch main). IDs não são segredo; o seed nunca roda neles. */
export const ENDPOINTS_PROIBIDOS = ['ep-fancy-field-b665zoxi'] as const;

const HOSTS_LOCAIS = ['localhost', '127.0.0.1'];
const PARAMS_DESTINO = new Set(['host', 'hostname', 'port', 'hostaddr']);

type EnvSeed = { SEED_ALLOW_REMOTE?: string | undefined; SEED_REMOTE_HOSTS?: string | undefined };

/** Query `host`/`port`/`hostaddr` sobrescreve o authority no postgres.js (libpq). */
function querySobrescreveDestino(destino: URL): boolean {
  for (const chave of destino.searchParams.keys()) {
    if (PARAMS_DESTINO.has(chave.toLowerCase())) return true;
  }
  return destino.hostname.includes(',');
}

/** `ep-xxxx`, `ep-xxxx-pooler` e `ep-xxxx-<compute>` identificam o mesmo endpoint. */
export function ehEndpointProibido(host: string): boolean {
  const rotulo = host.toLowerCase().split('.')[0] ?? '';
  return ENDPOINTS_PROIBIDOS.some((id) => rotulo === id || rotulo.startsWith(`${id}-`));
}

/** Lança Error com mensagem segura se o seed não puder rodar contra `url`; devolve o host se puder. */
export function validarDestinoSeed(url: string, env: EnvSeed = {}): string {
  let destino: URL;
  try {
    destino = new URL(url);
  } catch {
    throw new Error('Seed recusado: DATABASE_URL inválida.');
  }
  if (querySobrescreveDestino(destino)) {
    throw new Error('Seed recusado: DATABASE_URL inválida.');
  }
  const host = destino.hostname.toLowerCase();
  if (ehEndpointProibido(host)) {
    throw new Error('Seed recusado: o destino é o banco de produção (Neon main), proibido sempre.');
  }
  if (HOSTS_LOCAIS.includes(host)) return host;
  if (env.SEED_ALLOW_REMOTE !== '1') {
    throw new Error('Seed recusado: DATABASE_URL não aponta para localhost (remoto exige SEED_ALLOW_REMOTE=1 e SEED_REMOTE_HOSTS).');
  }
  const permitidos = (env.SEED_REMOTE_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (!permitidos.includes(host)) {
    throw new Error('Seed recusado: o host remoto não está em SEED_REMOTE_HOSTS (comparação exata).');
  }
  return host;
}
