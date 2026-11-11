import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { env } from '@/lib/env';
import { ErroDominio } from '@/lib/errors';

const SAL = 'louflow-meta-token';

function chave(): Buffer {
  const segredo = env.metaTokenKey;
  if (!segredo) {
    throw new ErroDominio('Defina META_TOKEN_KEY no ambiente antes de salvar um token.');
  }
  return scryptSync(segredo, SAL, 32);
}

export function cifrarToken(token: string): { ciphertext: Buffer; iv: Buffer } {
  const iv = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', chave(), iv);
  const corpo = Buffer.concat([cifra.update(token, 'utf8'), cifra.final()]);
  const tag = cifra.getAuthTag();
  return { ciphertext: Buffer.concat([corpo, tag]), iv };
}

export function decifrarToken(ciphertext: Buffer, iv: Buffer): string {
  try {
    const tag = ciphertext.subarray(ciphertext.length - 16);
    const corpo = ciphertext.subarray(0, ciphertext.length - 16);
    const decifra = createDecipheriv('aes-256-gcm', chave(), iv);
    decifra.setAuthTag(tag);
    return Buffer.concat([decifra.update(corpo), decifra.final()]).toString('utf8');
  } catch {
    throw new ErroDominio('Não foi possível ler o token salvo. Confira META_TOKEN_KEY.');
  }
}

export function dicaToken(token: string): string {
  return token.slice(-4);
}

export function comoBuffer(valor: Buffer | Uint8Array | string): Buffer {
  if (Buffer.isBuffer(valor)) return valor;
  if (typeof valor === 'string') return Buffer.from(valor.replace(/^\\x/, ''), 'hex');
  return Buffer.from(valor);
}
