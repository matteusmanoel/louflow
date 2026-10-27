import { Skeleton } from '@/components/ui/skeleton';

export default function FichaTecnicaLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <Skeleton className="h-7 w-48" />
      <div className="rounded-[var(--raio-card)] border border-[var(--borda-app)] p-5 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-9 w-full" /></div>
          <div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-9 w-full" /></div>
        </div>
        <div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-9 w-full" /></div>
        <div className="space-y-1.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-24 w-full" /></div>
        <Skeleton className="h-9 w-36 self-end" />
      </div>
    </div>
  );
}
