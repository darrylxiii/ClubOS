import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardWidgetProps {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
  headerAction?: ReactNode;
}

export const DashboardWidget = ({
  title,
  icon: Icon,
  iconClassName = "text-primary",
  children,
  isLoading = false,
  isEmpty = false,
  emptyMessage = "No data available",
  className,
  headerAction,
}: DashboardWidgetProps) => {
  if (isLoading) {
    return (
      <Card className={cn("glass-subtle rounded-2xl h-full flex flex-col", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="flex-1">
          <div className="space-y-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card className={cn("glass-subtle rounded-2xl h-full flex flex-col", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {Icon && <Icon className={cn("h-4 w-4", iconClassName)} />}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center py-4">
            <Info className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("glass-subtle rounded-2xl h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={cn("h-4 w-4", iconClassName)} />}
            {title}
          </div>
          {headerAction}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {children}
      </CardContent>
    </Card>
  );
};
