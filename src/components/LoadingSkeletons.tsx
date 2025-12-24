import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const JobCardSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
    </CardContent>
  </Card>
);

export const ApplicationCardSkeleton = () => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 flex-wrap">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const ProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-24 w-24 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    </div>
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  </div>
);

export const TableRowSkeleton = () => (
  <div className="flex items-center gap-4 p-4 border-b border-border/50">
    <Skeleton className="h-10 w-10 rounded" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
    <Skeleton className="h-8 w-24" />
  </div>
);

export const MessageSkeleton = () => (
  <div className="flex gap-3 p-4 border-b border-border/50">
    <Skeleton className="h-12 w-12 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  </div>
);

export const DashboardStatsSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    {[...Array(4)].map((_, i) => (
      <Card key={i}>
        <CardHeader className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </CardHeader>
      </Card>
    ))}
  </div>
);

export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {[...Array(count)].map((_, i) => (
      <Card key={i}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Unified page loading skeleton - use this for full page loads
export const PageLoadingSkeleton = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <LoadingSpinner size="xl" />
      <p className="text-sm text-muted-foreground animate-pulse font-medium tracking-wider text-xs uppercase">Loading Quantum OS...</p>
    </div>
  </div>
);

// Card loading skeleton for smaller sections
export const CardLoadingSkeleton = () => (
  <Card>
    <CardContent className="py-8">
      <div className="flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    </CardContent>
  </Card>
);

// Compact inline loading for buttons and small elements
export const InlineLoadingSkeleton = () => (
  <div className="flex items-center gap-2">
    <LoadingSpinner size="sm" />
    <span className="text-sm text-muted-foreground">Loading...</span>
  </div>
);
