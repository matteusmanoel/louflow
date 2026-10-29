'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Comentário longo cabe em quatro linhas. O restante abre com "Ver mais...". */
export function TextoComentario({ texto }: { texto: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [aberto, setAberto] = useState(false);
  const [cortavel, setCortavel] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      if (aberto) return;
      if (el.clientHeight === 0) return;
      setCortavel(el.scrollHeight > el.clientHeight + 1);
    };
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [texto, aberto]);

  return (
    <div className="flex flex-col items-start gap-1">
      <p
        ref={ref}
        className={cn(
          'm-0 whitespace-pre-wrap text-sm text-[var(--texto-forte)]',
          !aberto && 'line-clamp-4',
        )}
      >
        {texto}
      </p>
      {(cortavel || aberto) && (
        <button
          type="button"
          className="text-sm font-medium text-[var(--loumar-700)] hover:underline"
          aria-expanded={aberto}
          onClick={() => setAberto((valor) => !valor)}
        >
          {aberto ? 'Ver menos' : 'Ver mais...'}
        </button>
      )}
    </div>
  );
}
