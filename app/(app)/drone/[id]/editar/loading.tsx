import { Skeleton } from '@/components/ui/skeleton';

export default function EditarDroneLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <Skeleton className="h-7 w-48" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}
