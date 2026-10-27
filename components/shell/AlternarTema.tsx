'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tema = 'claro' | 'escuro' | 'sistema';

const OPCOES: { valor: Tema; rotulo: string; Icone: React.ComponentType<{ className?: string }> }[] = [
  { valor: 'claro', rotulo: 'Claro', Icone: Sun },
  { valor: 'escuro', rotulo: 'Escuro', Icone: Moon },
  { valor: 'sistema', rotulo: 'Sistema', Icone: Monitor },
];

function aplicarTema(tema: Tema) {
  const raiz = document.documentElement;
  if (tema === 'sistema') {
    raiz.dataset.tema = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
    return;
  }
  raiz.dataset.tema = tema;
}

const EVENTO_TEMA = 'louflow-tema';

function lerTemaSalvo(): Tema | null {
  try {
    const salvo = localStorage.getItem('louFlowTema');
    if (salvo === 'claro' || salvo === 'escuro' || salvo === 'sistema') return salvo;
  } catch {}
  return 'escuro';
}

function inscreverTema(ouvir: () => void) {
  window.addEventListener(EVENTO_TEMA, ouvir);
  window.addEventListener('storage', ouvir);
  return () => {
    window.removeEventListener(EVENTO_TEMA, ouvir);
    window.removeEventListener('storage', ouvir);
  };
}

/**
 * Três botões de ícone. O valor salvo entra só depois da hidratação,
 * para o servidor e o primeiro render do cliente coincidirem.
 */
export function AlternarTema({ tom = 'claro' }: { tom?: 'escuro' | 'claro' }) {
  const temaAtual = useSyncExternalStore(inscreverTema, lerTemaSalvo, () => null);

  useEffect(() => {
    if (temaAtual !== 'sistema') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => aplicarTema('sistema');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [temaAtual]);

  function selecionar(tema: Tema) {
    aplicarTema(tema);
    try {
      localStorage.setItem('louFlowTema', tema);
    } catch {}
    window.dispatchEvent(new Event(EVENTO_TEMA));
  }

  return (
    <div className={cn('tema-menu', tom === 'claro' && 'tema-menu--claro')} role="group" aria-label="Tema">
      {OPCOES.map(({ valor, rotulo, Icone }) => (
        <button
          key={valor}
          type="button"
          className="tema-opcao"
          aria-pressed={temaAtual === valor}
          aria-label={rotulo}
          title={rotulo}
          onClick={() => selecionar(valor)}
        >
          <Icone className="h-4 w-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
