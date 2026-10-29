'use client';

import { useEffect, useState } from 'react';
import { formatarRelogio } from '@/features/status/formatar-relogio';

type Props = {
  baseMs: number;
  atualizadoEmMs: number;
  pausado: boolean;
};

/** Avança no cliente enquanto a edição não está pausada. A base vem do servidor. */
export function RelogioEdicao({ baseMs, atualizadoEmMs, pausado }: Props) {
  const [agora, setAgora] = useState(atualizadoEmMs);

  useEffect(() => {
    if (pausado) return;
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [pausado, atualizadoEmMs]);

  const decorrido = pausado ? baseMs : baseMs + Math.max(0, agora - atualizadoEmMs);

  return (
    <span className="fonte-numero text-sm tabular-nums text-[var(--texto-forte)]" title="Tempo ativo, sem as pausas">
      {formatarRelogio(decorrido)}
    </span>
  );
}
