import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { exigirSessao } from '@/lib/auth';
import { AppShell } from '@/components/shell/AppShell';
import { AvisoDeRota } from '@/components/shell/AvisoDeRota';

export default async function LayoutAutenticado({ children }: { children: React.ReactNode }) {
  const usuario = await exigirSessao();
  if (usuario.deveTrocarPin) redirect('/trocar-pin');

  return (
    <AppShell usuario={usuario}>
      <Suspense>
        <AvisoDeRota />
      </Suspense>
      {children}
    </AppShell>
  );
}
