import { cn } from "@/lib/utils";

interface WidgetSkeletonProps {
  variant?: "card" | "list" | "metric";
  className?: string;
}

export const WidgetSkeleton = ({ variant = "card", className }: WidgetSkeletonProps) => {
  if (variant === "metric") {
    return (
      <div className={cn("rounded-2xl border border-border/20 bg-card/80 p-6 space-y-3", className)}>
        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        <div className="h-8 w-28 rounded bg-muted animate-pulse" />
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("rounded-2xl border border-border/20 bg-card/80 p-6 space-y-4", className)}>
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-2.5 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // card variant (default)
  return (
    <div className={cn("rounded-2xl border border-border/20 bg-card/80 p-6 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="h-24 w-full rounded-xl bg-muted animate-pulse" />
      <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
    </div>
  );
};
