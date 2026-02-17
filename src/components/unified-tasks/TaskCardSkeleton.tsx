import { cn } from "@/lib/utils";

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded bg-muted/60", className)} />
);

interface TaskCardSkeletonProps {
  variant?: "card" | "list" | "calendar";
}

export const TaskCardSkeleton = ({ variant = "card" }: TaskCardSkeletonProps) => {
  if (variant === "list") {
    return (
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border/10">
        <Shimmer className="h-2.5 w-2.5 rounded-full shrink-0" />
        <Shimmer className="h-1.5 w-1.5 rounded-full shrink-0" />
        <Shimmer className="h-4 w-48" />
        <div className="flex-1" />
        <Shimmer className="h-3 w-12 hidden sm:block" />
        <Shimmer className="h-3 w-8 hidden md:block" />
        <Shimmer className="h-5 w-5 rounded-full" />
      </div>
    );
  }

  if (variant === "calendar") {
    return (
      <div className="p-2 rounded-lg bg-card border border-border/15 space-y-1.5">
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-2.5 w-12" />
      </div>
    );
  }

  // Compact card skeleton (board view)
  return (
    <div className="p-2 rounded-lg border border-l-2 border-border/15 border-l-muted bg-card space-y-1.5">
      <Shimmer className="h-3.5 w-4/5" />
      <div className="flex items-center gap-1.5">
        <Shimmer className="h-1.5 w-1.5 rounded-full" />
        <Shimmer className="h-2.5 w-16" />
        <Shimmer className="h-2.5 w-10" />
      </div>
    </div>
  );
};

export const BoardColumnSkeleton = () => (
  <div className="rounded-lg border border-border/30 border-t-2 border-t-muted bg-muted/5">
    <div className="flex items-center gap-1.5 px-3 py-2">
      <Shimmer className="h-3.5 w-3.5 rounded" />
      <Shimmer className="h-3.5 w-16" />
      <Shimmer className="h-4 w-5 rounded-full" />
    </div>
    <div className="px-1.5 pb-1.5 space-y-1.5 min-h-[120px]">
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </div>
  </div>
);
