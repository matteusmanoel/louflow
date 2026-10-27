import { Skeleton } from '@/components/ui/skeleton';

export default function AgendaLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-7 flex-1 max-w-xs mx-auto" />
        <Skeleton className="h-9 w-9" />
      </div>
      {/* Cabeçalhos dias da semana */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-6 rounded" />
        ))}
        {/* Células do calendário */}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={`cell-${i}`} className="h-[72px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
