'use client';

import { Botao } from '@/components/ui';

/** Alterna claro/escuro e persiste em localStorage `louFlowTema`. Padrão claro. */
export function AlternarTema() {
  function alternar() {
    const raiz = document.documentElement;
    const escuro = raiz.dataset.tema !== 'escuro';
    if (escuro) raiz.dataset.tema = 'escuro';
    else delete raiz.dataset.tema;
    try {
      localStorage.setItem('louFlowTema', escuro ? 'escuro' : 'claro');
    } catch {}
  }

  return (
    <Botao variante="neutro" type="button" onClick={alternar} aria-label="Alternar tema claro ou escuro">
      Tema
    </Botao>
  );
}
