import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { exigirSessao } from '@/lib/auth';
import { AppShell } from '@/components/shell/AppShell';
import { AvisoDeRota } from '@/components/shell/AvisoDeRota';
import { Toaster } from 'sonner';

/**
 * Layout autenticado.
 * Zona protegida — alterações justificadas:
 * - <Toaster> do Sonner, para o feedback de Server Action em lib/toast.ts.
 * - Slot @painel: a modal de demanda só intercepta rotas do layout que a contém.
 *   No layout de /demandas o clique vindo da agenda ou do dashboard trocava a página.
 */
export default async function LayoutAutenticado({
  children,
  painel,
}: {
  children: React.ReactNode;
  painel: React.ReactNode;
}) {
  const usuario = await exigirSessao();
  if (usuario.deveTrocarPin) redirect('/trocar-pin');

  return (
    <>
      <AppShell usuario={usuario}>
        <Suspense>
          <AvisoDeRota />
        </Suspense>
        {children}
        {painel}
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
