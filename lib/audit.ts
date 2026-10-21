import 'server-only';
import type { Db } from './db';

const CHAVES_SENSIVEIS = /pin|hash|token|senha|secret|segredo|pepper/i;

/** Remove campos sensíveis antes de serializar antes/depois. */
export function sanitizarEstado(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(sanitizarEstado);
  if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>)
        .filter(([chave]) => !CHAVES_SENSIVEIS.test(chave))
        .map(([chave, v]) => [chave, sanitizarEstado(v)]),
    );
  }
  return valor;
}

const serializar = (v: unknown) => (v === undefined ? null : JSON.stringify(sanitizarEstado(v)));

/** Auditoria Administrativa, na mesma transação da ação. Nunca grava PIN, hash ou token. */
export async function registrarAuditoria(
  tx: Db,
  entrada: { acao: string; usuarioId: string | null; alvo?: string; detalhes?: string; antes?: unknown; depois?: unknown },
): Promise<void> {
  await tx`
    INSERT INTO audit_log (action, user_id, target, details, before, after)
    VALUES (${entrada.acao}, ${entrada.usuarioId}, ${entrada.alvo ?? null}, ${entrada.detalhes ?? null},
            ${serializar(entrada.antes)}, ${serializar(entrada.depois)})`;
}
