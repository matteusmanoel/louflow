import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function tokenAleatorio(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Digest persistido no lugar do token; o token em si nunca vai para o banco. */
export function digestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function iguaisEmTempoConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Identificador no formato legado: prefixo + 10 hex maiúsculos. */
export function novoId(prefixo = 'LF'): string {
  return prefixo + randomBytes(5).toString('hex').toUpperCase();
}
