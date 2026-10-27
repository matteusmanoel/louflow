import type { ReactNode } from 'react';

export default function LayoutDemandas({
  children,
  painel,
}: {
  children: ReactNode;
  painel: ReactNode;
}) {
  return (
    <>
      {children}
      {painel}
    </>
  );
}
