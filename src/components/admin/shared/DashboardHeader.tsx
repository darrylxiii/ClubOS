import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  title: string;
  description: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  actions?: React.ReactNode;
}

export const DashboardHeader = ({
  title,
  description,
  onRefresh,
  isRefreshing = false,
  actions,
}: DashboardHeaderProps) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onRefresh && (
          <Button 
            onClick={onRefresh} 
            variant="outline" 
            disabled={isRefreshing}
            size="default"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>
    </div>
  );
};

