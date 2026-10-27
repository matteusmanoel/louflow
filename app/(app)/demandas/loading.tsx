import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingDemandas() {
  return (
    <div className="flex flex-col gap-5">
      {/* Barra de filtros skeleton */}
      <Skeleton className="h-[68px] w-full rounded-[var(--raio-painel)]" />
      {/* Cards */}
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[92px] w-full" />
      ))}
    </div>
  );
}
