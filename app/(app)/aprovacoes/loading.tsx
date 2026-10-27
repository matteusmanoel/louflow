import { Skeleton } from '@/components/ui/skeleton';

export default function AprovacoesLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-7 w-40" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[var(--raio-card)] border border-[var(--borda-app)] p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-2 mt-1">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
