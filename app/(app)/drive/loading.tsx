import { ContainerPagina } from '@/components/ui/container-pagina';

export default function CarregandoDrive() {
  return (
    <ContainerPagina>
      <div className="h-4 w-32 animate-pulse rounded bg-[var(--fundo-app)]" />
      <div className="h-8 w-48 animate-pulse rounded bg-[var(--fundo-app)]" />
      <div className="h-40 animate-pulse rounded-[var(--raio-card)] bg-[var(--fundo-app)]" />
    </ContainerPagina>
  );
}
