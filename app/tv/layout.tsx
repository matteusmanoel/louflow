/**
 * S1-09 (#11564): casca do Painel de TV. O <html> fica no layout raiz;
 * esta rota só cobre a viewport com a identidade própria de tv.css.
 */
import type { ReactNode } from 'react';
import './tv.css';

export const metadata = {
  title: 'Painel de TV — LouFlow',
  description: 'Painel público de demandas ativas do LouFlow',
  robots: 'noindex, nofollow',
};

export default function LayoutTv({ children }: { children: ReactNode }) {
  return <div className="painel-tv">{children}</div>;
}
