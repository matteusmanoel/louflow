import { Skeleton } from '@/components/ui/skeleton';

export default function LoadingDetalhe() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-[180px] w-full" />
      <Skeleton className="h-[120px] w-full" />
    </div>
  );
}
