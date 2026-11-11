'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Polling de /api/sync (30 s por padrão). Quando a revisão muda, recarrega os Server Components.
 * Devolve o instante da última verificação bem-sucedida.
 */
export function useSincronizacao(intervaloMs = 30_000): Date | null {
  const router = useRouter();
  const revisao = useRef<number | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);

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
        setAtualizadoEm(new Date());
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

  return atualizadoEm;
}
