import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { UnifiedLoader } from "@/components/ui/unified-loader";

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
  <UnifiedLoader variant="section" text="Loading content..." />
);

// Card loading skeleton for smaller sections
export const CardLoadingSkeleton = () => (
  <Card>
    <CardContent className="py-8">
      <UnifiedLoader variant="section" className="min-h-[100px]" />
    </CardContent>
  </Card>
);

// Compact inline loading for buttons and small elements
export const InlineLoadingSkeleton = () => (
  <UnifiedLoader variant="inline" text="Loading..." />
);

// ===== Phase 2: New Domain-Specific Skeletons =====

// Game results skeleton for admin game pages
export const GameResultsSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>
    <Card>
      <CardContent className="pt-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border/30">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

// Admin table skeleton with configurable columns
export const AdminTableSkeleton = ({ columns = 7, rows = 5 }: { columns?: number; rows?: number }) => (
  <div className="rounded-md border">
    <div className="p-4 border-b border-border/50">
      <div className="flex gap-4">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${100 / columns}%` }} />
        ))}
      </div>
    </div>
    {[...Array(rows)].map((_, rowIndex) => (
      <div key={rowIndex} className="p-4 border-b border-border/30 last:border-0">
        <div className="flex gap-4 items-center">
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className="h-4" 
              style={{ width: `${100 / columns}%` }} 
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// Workspace/sidebar skeleton
export const WorkspaceSkeleton = () => (
  <div className="space-y-3 p-3">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
    <Skeleton className="h-px w-full" />
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-2">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-4 w-20" />
      </div>
    ))}
  </div>
);

// CRM activity skeleton
export const CRMActivitySkeleton = () => (
  <div className="space-y-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border/30">
        <Skeleton className="h-5 w-5 rounded mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    ))}
  </div>
);

// Scheduling/calendar skeleton
export const SchedulingSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-9 rounded" />
        <Skeleton className="h-9 w-9 rounded" />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-2">
      {[...Array(7)].map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
    <div className="grid grid-cols-7 gap-2">
      {[...Array(35)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded" />
      ))}
    </div>
  </div>
);

// KPI/Analytics card skeleton
export const AnalyticsCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3 w-32" />
    </CardContent>
  </Card>
);

// Comment/thread skeleton
export const CommentSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

// Settings section skeleton
export const SettingsSkeleton = () => (
  <div className="space-y-6">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border/30">
            <div className="space-y-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Activity feed skeleton for candidate profiles
export const ActivityFeedSkeleton = () => (
  <div className="space-y-3">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex items-start gap-3 p-2 rounded-lg">
        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);
