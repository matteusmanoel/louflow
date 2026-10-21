'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Polling de /api/sync (30 s por padrão). Quando a revisão muda, recarrega os Server Components.
 * Usado pelas telas de Demanda; módulos sem Demanda recarregam ao abrir a aba ou a cada 60 s.
 */
export function useSincronizacao(intervaloMs = 30_000) {
  const router = useRouter();
  const revisao = useRef<number | null>(null);

  useEffect(() => {
    let ativo = true;
    async function verificar() {
      if (document.hidden) return;
      try {
        const desde = revisao.current ?? 0;
        const resposta = await fetch(`/api/sync?desde=${desde}`, { cache: 'no-store' });
        if (!resposta.ok || !ativo) return;
        const { alterou, revisao: atual } = (await resposta.json()) as { alterou: boolean; revisao: number };
        if (revisao.current !== null && alterou) router.refresh();
        revisao.current = atual;
      } catch {
        // Rede instável: tenta no próximo ciclo.
      }
    }
    void verificar();
    const id = setInterval(verificar, intervaloMs);
    return () => {
      ativo = false;
      clearInterval(id);
    };
  }, [intervaloMs, router]);
}
