'use client';

import { useEffect, useRef, useState } from 'react';
import type { Indicador } from '@/features/dashboard/consultas';

function Numero({ valor }: { valor: number }) {
  const [atual, setAtual] = useState(valor);
  const anterior = useRef(valor);

  useEffect(() => {
    const de = anterior.current;
    anterior.current = valor;
    if (de === valor) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const quadro = requestAnimationFrame(() => setAtual(valor));
      return () => cancelAnimationFrame(quadro);
    }
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / 300);
      setAtual(Math.round(de + (valor - de) * t));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor]);

  return (
    <p className="fonte-numero text-2xl font-semibold tabular-nums text-[var(--texto-forte)]">{atual}</p>
  );
}

export function Indicadores({ itens }: { itens: Indicador[] }) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 min-[981px]:grid-cols-4" aria-label="Indicadores">
      {itens.map((item) => (
        <li
          key={item.chave}
          className="min-w-0 rounded-[var(--raio-card)] border border-[var(--borda-app)] bg-[var(--superficie)] p-4 transition-colors duration-150"
        >
          <p className="text-xs text-[var(--texto-suave)]">{item.rotulo}</p>
          <Numero valor={item.valor} />
        </li>
      ))}
    </ul>
  );
}
