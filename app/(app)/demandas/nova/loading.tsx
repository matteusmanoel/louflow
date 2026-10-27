import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingNovaDemanda() {
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}
