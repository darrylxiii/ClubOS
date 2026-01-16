import { memo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface QuickStat {
  id: string;
  label: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
  };
  badge?: {
    label: string;
    variant?: "default" | "success" | "warning" | "destructive";
  };
  onClick?: () => void;
}

interface QuickStatsGridProps {
  stats: QuickStat[];
  columns?: 2 | 3 | 4 | 6;
  variant?: "default" | "compact" | "glass";
  className?: string;
}

const getTrendIcon = (direction: "up" | "down" | "neutral") => {
  switch (direction) {
    case "up":
      return <TrendingUp className="w-3 h-3 text-green-500" />;
    case "down":
      return <TrendingDown className="w-3 h-3 text-red-500" />;
    default:
      return <Minus className="w-3 h-3 text-muted-foreground" />;
  }
};

const getBadgeClass = (variant?: "default" | "destructive" | "success" | "warning") => {
  switch (variant) {
    case "success":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "warning":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "destructive":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "";
  }
};

export const QuickStatsGrid = memo(({
  stats,
  columns = 4,
  variant = "default",
  className,
}: QuickStatsGridProps) => {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };

  const cardClasses = {
    default: "bg-card border border-border/50",
    compact: "bg-card/50 border border-border/30",
    glass: "bg-card/20 backdrop-blur-sm border border-border/20 hover:border-border/40",
  };

  return (
    <div className={cn("grid gap-3", gridCols[columns], className)}>
      {stats.map((stat) => (
        <Card
          key={stat.id}
          className={cn(
            cardClasses[variant],
            "transition-all duration-200",
            stat.onClick && "cursor-pointer hover:shadow-lg"
          )}
          onClick={stat.onClick}
        >
          <CardContent className={cn(
            "p-4",
            variant === "compact" && "p-3"
          )}>
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {stat.icon}
              </div>
              {stat.badge && (
                <Badge
                  variant="outline"
                  className={cn("text-xs", getBadgeClass(stat.badge.variant))}
                >
                  {stat.badge.label}
                </Badge>
              )}
            </div>
            
            <div className="space-y-1">
              <p className={cn(
                "font-bold text-foreground",
                variant === "compact" ? "text-2xl" : "text-3xl"
              )}>
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              
              {(stat.subtext || stat.trend) && (
                <div className="flex items-center gap-2 pt-1">
                  {stat.trend && (
                    <div className="flex items-center gap-1">
                      {getTrendIcon(stat.trend.direction)}
                      <span className={cn(
                        "text-xs font-medium",
                        stat.trend.direction === "up" && "text-green-500",
                        stat.trend.direction === "down" && "text-red-500",
                        stat.trend.direction === "neutral" && "text-muted-foreground"
                      )}>
                        {stat.trend.value}
                      </span>
                    </div>
                  )}
                  {stat.subtext && (
                    <span className="text-xs text-muted-foreground">
                      {stat.subtext}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

QuickStatsGrid.displayName = 'QuickStatsGrid';