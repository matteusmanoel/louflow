import type { Metadata } from 'next';
import { classesFontes } from './fontes';
import './globals.css';

export const metadata: Metadata = {
  title: 'LouFlow',
  description: 'Gestão da produção de conteúdo do marketing Loumar',
  robots: { index: false, follow: false },
};

/**
 * Aplica o tema salvo antes da pintura para evitar flash.
 * Padrão: escuro (primeira visita sem preferência salva).
 * Suporta 3 valores: 'claro' | 'escuro' | 'sistema'.
 * 'sistema' lê prefers-color-scheme em tempo real.
 *
 * Justificativa de alteração (zona protegida):
 * Script atualizado pelo plano de refatoração visual para suportar
 * o seletor de 3 opções (Claro/Escuro/Sistema) implementado em AlternarTema.tsx.
 * classesFontes aplica Inter, Manrope e Fraunces (pedido explícito de tipografia).
 */
const scriptTema = `try{var d=document.documentElement,t=localStorage.getItem('louFlowTema');if(t==='sistema'){d.dataset.tema=window.matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro';}else if(t==='claro'){d.dataset.tema='claro';}else{d.dataset.tema='escuro';}if(localStorage.getItem('louFlowMenuRecolhido')==='1')d.dataset.menu='recolhido';}catch(e){document.documentElement.dataset.tema='escuro';}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={classesFontes} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
