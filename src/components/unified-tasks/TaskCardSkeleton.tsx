import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TaskCardSkeletonProps {
  variant?: "card" | "list" | "calendar";
}

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded bg-muted/60", className)} />
);

export const TaskCardSkeleton = ({ variant = "card" }: TaskCardSkeletonProps) => {
  if (variant === "list") {
    return (
      <Card className="border-2 border-border">
        <div className="p-4 flex items-start gap-4">
          <Shimmer className="h-4 w-4 rounded-sm mt-1 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Shimmer className="h-5 w-5 rounded" />
              <Shimmer className="h-4 w-48" />
            </div>
            <Shimmer className="h-3 w-32" />
            <Shimmer className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </Card>
    );
  }

  if (variant === "calendar") {
    return (
      <div className="p-2 rounded-lg bg-card border border-border space-y-2">
        <div className="flex items-start gap-2">
          <Shimmer className="h-4 w-4 rounded shrink-0" />
          <Shimmer className="h-3 w-full" />
        </div>
        <Shimmer className="h-3 w-16" />
      </div>
    );
  }

  // Default card skeleton (board view)
  return (
    <Card className="p-4 border-border/40 bg-card/60 space-y-3">
      {/* Header badges */}
      <div className="flex items-center justify-between">
        <Shimmer className="h-5 w-14 rounded-full" />
        <Shimmer className="h-4 w-16" />
      </div>
      {/* Title */}
      <div className="space-y-1.5">
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-3/4" />
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <div className="flex -space-x-2">
          <Shimmer className="h-6 w-6 rounded-full" />
          <Shimmer className="h-6 w-6 rounded-full" />
        </div>
        <Shimmer className="h-3 w-20" />
      </div>
    </Card>
  );
};

export const BoardColumnSkeleton = () => (
  <Card className="border-2 border-border/30 min-w-[300px]">
    <div className="p-4 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shimmer className="h-5 w-5 rounded" />
          <Shimmer className="h-5 w-24" />
        </div>
        <Shimmer className="h-5 w-8 rounded-full" />
      </div>
    </div>
    <div className="p-2 space-y-3 min-h-[400px]">
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </div>
  </Card>
);
