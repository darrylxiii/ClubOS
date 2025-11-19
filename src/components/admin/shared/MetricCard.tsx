import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/adminColors";

interface MetricCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  iconColor?: 'success' | 'warning' | 'critical' | 'info' | 'neutral';
  primaryMetric: string | number;
  secondaryText?: string;
  children?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
}

export const MetricCard = ({
  title,
  description,
  icon: Icon,
  iconColor = 'neutral',
  primaryMetric,
  secondaryText,
  children,
  trend,
  className,
}: MetricCardProps) => {
  const colors = statusColors[iconColor];

  return (
    <Card className={cn(colors.border, "transition-all duration-300", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </div>
        <div className={cn("p-2 rounded-lg", colors.bg)}>
          <Icon className={cn("h-4 w-4", colors.icon)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-bold">{primaryMetric}</div>
        {secondaryText && (
          <p className="text-xs text-muted-foreground">{secondaryText}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 text-xs">
            {trend.isPositive !== false ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-critical" />
            )}
            <span className={trend.isPositive !== false ? "text-success" : "text-critical"}>
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
};
