/**
 * Wrapper centralizado do Sonner para o LouFlow.
 *
 * Regra: toasts são disparados no CLIENTE, após receber o resultado da Server Action.
 * Nunca chamar toast() diretamente de Server Components ou Server Actions.
 *
 * Uso:
 *   import { mostrarFeedback } from '@/lib/toast'
 *   const resultado = await minhaAction(dados)
 *   mostrarFeedback(resultado)
 */
import { toast } from 'sonner';

/** Resultado padrão das Server Actions do LouFlow */
export interface ResultadoAcao<T = unknown> {
  ok: boolean;
  mensagem?: string;
  dados?: T;
}

/**
 * Exibe feedback de acordo com o resultado de uma Server Action.
 * Sucesso → toast verde; erro → toast vermelho.
 */
export function mostrarFeedback(resultado: ResultadoAcao): void {
  if (resultado.ok) {
    toast.success(resultado.mensagem ?? 'Operação realizada com sucesso.');
  } else {
    toast.error(resultado.mensagem ?? 'Ocorreu um erro. Tente novamente.');
  }
}

/**
 * Re-exporta o toast nativo do Sonner para casos que precisam de controle manual
 * (ex: toast.loading → toast.dismiss após upload assíncrono).
 */
export { toast };
