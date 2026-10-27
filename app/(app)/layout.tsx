import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { exigirSessao } from '@/lib/auth';
import { AppShell } from '@/components/shell/AppShell';
import { AvisoDeRota } from '@/components/shell/AvisoDeRota';
import { Toaster } from 'sonner';

/**
 * Layout autenticado.
 * Zona protegida — alteração justificada: adição de <Toaster> do Sonner
 * como requisito do plano de refatoração visual (Etapa 4).
 * Necessário para que Server Action feedback funcione via lib/toast.ts.
 */
export default async function LayoutAutenticado({ children }: { children: React.ReactNode }) {
  const usuario = await exigirSessao();
  if (usuario.deveTrocarPin) redirect('/trocar-pin');

  return (
    <>
      <AppShell usuario={usuario}>
        <Suspense>
          <AvisoDeRota />
        </Suspense>
        {children}
      </AppShell>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: 'var(--fonte)',
            fontSize: '13px',
            borderRadius: 'var(--raio-card)',
          },
        }}
      />
    </>
  );
}
