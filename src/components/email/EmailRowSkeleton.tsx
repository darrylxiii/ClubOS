import { Skeleton } from "@/components/ui/skeleton";

export function EmailRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-10 w-10 rounded-full" />
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}
