import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LouFlow',
  description: 'Gestão da produção de conteúdo do marketing Loumar',
  robots: { index: false, follow: false },
};

/** Aplica o tema salvo antes da pintura para evitar flash. Padrão: claro (não segue o sistema). */
const scriptTema = `try{var d=document.documentElement;if(localStorage.getItem('louFlowTema')==='escuro')d.dataset.tema='escuro';if(localStorage.getItem('louFlowMenuRecolhido')==='1')d.dataset.menu='recolhido'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
