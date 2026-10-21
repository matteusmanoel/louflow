import 'server-only';
import { createHmac, randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from './env';

/** [PROTEGIDO] Tratamento do PIN. Nunca registrar o PIN nem o hash em log, Histórico ou Auditoria. */

export const FORMATO_PIN = /^\d{6}$/;
const CUSTO = 11;

function comPepper(pin: string): string {
  return createHmac('sha256', env.pinPepper).update(pin).digest('base64');
}

export async function gerarHashPin(pin: string): Promise<string> {
  if (!FORMATO_PIN.test(pin)) throw new Error('PIN fora do formato');
  return bcrypt.hash(comPepper(pin), CUSTO);
}

export async function conferirPin(pin: string, hash: string | null): Promise<boolean> {
  // Sem hash, ainda executa uma comparação para não revelar a ausência pelo tempo de resposta.
  hashFicticio ??= bcrypt.hash('-', CUSTO);
  const alvo = hash ?? (await hashFicticio);
  const ok = await bcrypt.compare(comPepper(pin), alvo);
  return ok && hash !== null;
}

export function gerarPinProvisorio(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

let hashFicticio: Promise<string> | undefined;
