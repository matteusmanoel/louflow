import { Skeleton } from '@/components/ui/skeleton';

export default function MidiaMovelLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-7 w-36" />
      {/* Formulário de nova reserva */}
      <div className="rounded-[var(--raio-card)] border border-[var(--borda-app)] p-5 flex flex-col gap-4 max-w-md">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-28 self-start" />
      </div>
      {/* Lista de reservas */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[var(--raio-card)] border border-[var(--borda-app)] p-4 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
