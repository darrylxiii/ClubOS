import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  CloudOff 
} from "lucide-react";

export type SyncStatus = "syncing" | "synced" | "error" | "pending" | "offline";

interface SystemSyncIndicatorProps {
  status: SyncStatus;
  lastSyncAt?: string | number | Date | null;
  details?: string;
  label?: string;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  onRetry?: () => void;
}

const statusConfig: Record<SyncStatus, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  className: string;
  animation?: string;
}> = {
  syncing: {
    icon: Loader2,
    label: "Syncing",
    className: "bg-primary/10 text-primary border-primary/30",
    animation: "animate-spin",
  },
  synced: {
    icon: CheckCircle,
    label: "Synced",
    className: "bg-success/10 text-success border-success/30",
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  offline: {
    icon: CloudOff,
    label: "Offline",
    className: "bg-muted/50 text-muted-foreground border-border/50",
  },
};

export const SystemSyncIndicator = memo(({
  status,
  lastSyncAt,
  details,
  label,
  showTooltip = true,
  size = "md",
  className,
  onRetry,
}: SystemSyncIndicatorProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  const formattedTime = lastSyncAt
    ? formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true })
    : null;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border gap-1.5 inline-flex items-center cursor-default",
        config.className,
        sizeClasses[size],
        onRetry && status === "error" && "cursor-pointer hover:opacity-80",
        className
      )}
      onClick={status === "error" && onRetry ? onRetry : undefined}
    >
      <Icon className={cn(iconSizes[size], config.animation)} />
      {label || config.label}
    </Badge>
  );

  if (!showTooltip || (!formattedTime && !details)) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="text-xs space-y-1">
            {formattedTime && (
              <p>
                <strong>Last sync:</strong> {formattedTime}
              </p>
            )}
            {details && <p className="text-muted-foreground">{details}</p>}
            {status === "error" && onRetry && (
              <p className="text-primary">Click to retry</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

SystemSyncIndicator.displayName = "SystemSyncIndicator";

// Helper function to determine sync status from common patterns
export function getSyncStatus(options: {
  isSyncing?: boolean;
  isConnected?: boolean;
  hasError?: boolean;
  isPending?: boolean;
}): SyncStatus {
  const { isSyncing, isConnected = true, hasError, isPending } = options;
  
  if (!isConnected) return "offline";
  if (isSyncing) return "syncing";
  if (hasError) return "error";
  if (isPending) return "pending";
  return "synced";
}
