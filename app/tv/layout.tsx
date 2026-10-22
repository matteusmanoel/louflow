/**
 * S1-09 (#11564): Layout exclusivo do Painel de TV — sem shell da aplicação principal,
 * sem autenticação. Importa tokens visuais próprios (docs/design-tokens.md §6).
 */
import type { ReactNode } from 'react';
import './tv.css';

export const metadata = {
  title: 'Painel de TV — LouFlow',
  description: 'Painel público de demandas ativas do LouFlow',
  robots: 'noindex, nofollow',
};

export default function LayoutTv({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          padding: 0,
          background: 'var(--tv-fundo)',
          color: 'var(--tv-texto-forte)',
          fontFamily: 'var(--tv-fonte)',
          minHeight: '100vh',
        }}
      >
        {children}
      </body>
    </html>
  );
}
