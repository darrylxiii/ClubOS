import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const MetricCardSkeleton = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
};
