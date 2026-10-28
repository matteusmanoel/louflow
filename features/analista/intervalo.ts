import { ErroDominio } from '@/lib/errors';

const ESPERA_MS = 4_000;
const ultimo = new Map<string, number>();

/** Intervalo mínimo de 4 s por usuário, no servidor. */
export function consumirIntervalo(usuarioId: string, agora = Date.now()): void {
  const anterior = ultimo.get(usuarioId);
  if (anterior != null && agora - anterior < ESPERA_MS) {
    throw new ErroDominio('Aguarde 4 segundos antes de outra pergunta.');
  }
  ultimo.set(usuarioId, agora);
}

export function reiniciarIntervaloAnalista(): void {
  ultimo.clear();
}
