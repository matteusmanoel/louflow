import 'server-only';
import type { Db } from './db';

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const DIGITOS_LONGOS = /\b\d{6,}\b/g;

/** Remove e-mails e sequências numéricas longas (PIN, documentos) e limita o tamanho. */
export function sanitizarMensagem(texto: string, limite = 500): string {
  return texto.replace(EMAIL, '[email]').replace(DIGITOS_LONGOS, '[num]').slice(0, limite);
}

/** Registra falha em error_log sem dados pessoais. Nunca lança. */
export async function registrarErro(sql: Db, origem: string, erro: unknown, detalhes?: string): Promise<void> {
  const mensagem = erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro);
  try {
    await sql`
      INSERT INTO error_log (origin, message, details)
      VALUES (${origem.slice(0, 60)}, ${sanitizarMensagem(mensagem)}, ${detalhes ? sanitizarMensagem(detalhes, 1000) : null})`;
  } catch {
    // Falha ao registrar não pode derrubar a requisição.
  }
}
