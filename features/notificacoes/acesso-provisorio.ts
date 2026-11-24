/**
 * Mensagem única da virada: link, e-mail e PIN provisório no privado.
 * O grupo do setor não entra neste caminho.
 */

const WHATSAPP = /^55[0-9]{10,11}$/;

export type ClasseDestinatario = 'elegivel' | 'inativo' | 'sintetico' | 'sem_whatsapp' | 'ja_tem_pin' | 'whatsapp_invalido';

export type UsuarioAcesso = {
  email: string;
  whatsapp: string | null;
  ativo: boolean;
  temPin: boolean;
};

export function classificarDestinatario(usuario: UsuarioAcesso): ClasseDestinatario {
  if (!usuario.ativo) return 'inativo';
  if (usuario.email.toLowerCase().endsWith('@exemplo.test')) return 'sintetico';
  if (usuario.temPin) return 'ja_tem_pin';
  if (!usuario.whatsapp) return 'sem_whatsapp';
  if (!WHATSAPP.test(usuario.whatsapp)) return 'whatsapp_invalido';
  return 'elegivel';
}

/** URL pública do acesso. Recusa local, sintético e grupo. */
export function urlPublica(valor: string): string {
  let destino: URL;
  try {
    destino = new URL(valor.trim());
  } catch {
    throw new Error('APP_URL inválida.');
  }
  const host = destino.hostname.toLowerCase();
  if (destino.protocol !== 'https:' || destino.username || destino.password) {
    throw new Error('APP_URL precisa ser https, sem usuário na URL.');
  }
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.exemplo.test') || host === 'exemplo.test') {
    throw new Error('APP_URL não pode ser local nem sintética.');
  }
  return destino.origin;
}

/** Número privado. JID de grupo não passa. */
export function numeroPrivado(whatsapp: string): string {
  const numero = whatsapp.trim();
  if (numero.includes('@') || !WHATSAPP.test(numero)) {
    throw new Error('O destino não é um número privado.');
  }
  return numero;
}

export function textoAcessoProvisorio(dados: { nome: string; url: string; email: string; pin: string }): string {
  const nome = dados.nome.trim() || 'olá';
  return [
    `Olá, ${nome}.`,
    '',
    'O LouFlow novo está no ar. Entre com o e-mail e o PIN provisório. No primeiro acesso, o sistema pede um PIN novo de 6 dígitos.',
    '',
    `Acesse: ${dados.url}`,
    `Usuário: ${dados.email}`,
    `PIN provisório: ${dados.pin}`,
    '',
    'Não encaminhe esta mensagem.',
    '',
    'Loumar Turismo',
  ].join('\n');
}

export async function enviarTextoPrivado(opcoes: {
  base: string;
  token: string;
  numero: string;
  texto: string;
  buscar?: typeof fetch;
}): Promise<void> {
  const numero = numeroPrivado(opcoes.numero);
  const base = opcoes.base.trim().replace(/\/$/, '');
  if (!base || !opcoes.token.trim()) throw new Error('A instância uazapi não está configurada.');
  const buscar = opcoes.buscar ?? fetch;
  const resposta = await buscar(`${base}/send/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      token: opcoes.token.trim(),
    },
    body: JSON.stringify({ number: numero, text: opcoes.texto }),
  });
  if (!resposta.ok) throw new Error(`uazapi respondeu ${resposta.status}`);
}
