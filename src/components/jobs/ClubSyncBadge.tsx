import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles, Clock, XCircle, Ban } from "lucide-react";

export type ClubSyncStatus = "accepted" | "pending" | "not_offered" | "declined" | null;

interface ClubSyncBadgeProps {
  status: ClubSyncStatus;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const statusConfig: Record<NonNullable<ClubSyncStatus>, {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  accepted: {
    label: "Club Sync On",
    description: "AI-powered matching is active. Premium vetted candidates are being matched to this role.",
    icon: Sparkles,
    className: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  },
  pending: {
    label: "Sync Pending",
    description: "Club Sync request is awaiting approval from The Quantum Club team.",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  },
  not_offered: {
    label: "Club Sync Off",
    description: "AI matching is not enabled. Enable Club Sync for 3x faster hiring with vetted candidates.",
    icon: XCircle,
    className: "bg-muted/50 text-muted-foreground border-border/50",
  },
  declined: {
    label: "Sync Declined",
    description: "Club Sync was declined for this role. You can request it again anytime.",
    icon: Ban,
    className: "bg-muted/30 text-muted-foreground/70 border-border/30",
  },
};

export const ClubSyncBadge = memo(({
  status,
  size = "md",
  showTooltip = true,
  className,
}: ClubSyncBadgeProps) => {
  if (!status) return null;
  
  const config = statusConfig[status];
  if (!config) return null;
  
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

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border gap-1.5 inline-flex items-center transition-all",
        config.className,
        sizeClasses[size],
        status === "accepted" && "animate-pulse",
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

ClubSyncBadge.displayName = "ClubSyncBadge";

// Helper function to get status info for other components
export const getClubSyncStatusInfo = (status: ClubSyncStatus) => {
  if (!status) return null;
  return statusConfig[status] || null;
};
