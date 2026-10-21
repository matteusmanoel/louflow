'use server';

import type { Resultado } from '@/lib/action';

/**
 * S1-15 (#11570): desliga um Usuário — Demandas em execução ou pausadas voltam para Não iniciada
 * (pela máquina de Status), as em Aprovação são preservadas, e os acessos são invalidados.
 * A tela de Usuários (S1-01) já chama esta ação; a assinatura não muda.
 */
export async function desligarUsuario(entrada: { usuarioId: string }): Promise<Resultado<null>> {
  void entrada;
  return { ok: false, mensagem: 'Desligamento ainda não disponível.' };
}
