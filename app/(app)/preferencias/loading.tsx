import { Skeleton } from '@/components/ui/skeleton';

export default function PreferenciasLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-lg">
      <Skeleton className="h-7 w-48" />
      <div className="rounded-[var(--raio-card)] border border-[var(--borda-app)] p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-[var(--raio-input)]" />
          ))}
        </div>
        <Skeleton className="h-9 w-36 self-start" />
      </div>
    </div>
  );
}
