import { Skeleton } from '@/components/ui/skeleton';

export default function DetalheUsuarioLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl">
      <Skeleton className="h-7 w-48" />
      {/* Formulário */}
      <div className="rounded-[var(--raio-card)] border border-[var(--borda-app)] p-5 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32 self-start" />
      </div>
      {/* Ações */}
      <div className="rounded-[var(--raio-card)] border border-[var(--borda-app)] p-5 flex flex-col gap-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
    </div>
  );
}
