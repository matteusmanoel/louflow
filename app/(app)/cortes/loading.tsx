import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[52px] w-full" />
      ))}
    </div>
  );
}
