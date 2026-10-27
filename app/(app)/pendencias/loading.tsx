import { Skeleton } from '@/components/ui/skeleton';

export default function PendenciasLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-7 w-40" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[var(--raio-card)] border border-[var(--borda-app)] p-5 flex flex-col gap-3 shadow-[var(--sombra-card)]">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-8 w-36" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
