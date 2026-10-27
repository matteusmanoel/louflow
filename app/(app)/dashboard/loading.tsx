import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-7 w-40" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[var(--raio-card)] border border-[var(--borda-app)] p-4 flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Skeleton className="h-64 rounded-[var(--raio-card)]" />
        <Skeleton className="h-64 rounded-[var(--raio-card)]" />
      </div>
    </div>
  );
}
