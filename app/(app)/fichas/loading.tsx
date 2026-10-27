import { Skeleton } from '@/components/ui/skeleton';

export default function FilaDeFichasLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-7 w-40" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-[var(--raio-card)] border border-[var(--borda-app)] p-4 flex items-center gap-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="ml-auto h-8 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
