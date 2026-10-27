import { Skeleton } from '@/components/ui/skeleton';

export default function LixeiraLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-7 w-36" />
      <div className="rounded-[var(--raio-card)] border border-[var(--borda-app)] overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-3 py-3 border-b border-[var(--borda-app)] last:border-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="ml-auto h-4 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
