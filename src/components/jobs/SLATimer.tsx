import { memo } from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SLATimerProps {
  /** Days since last activity or stage change */
  daysSinceActivity: number;
  /** SLA threshold in days (default: 3) */
  slaThreshold?: number;
  /** Show as compact badge or full display */
  variant?: "badge" | "inline" | "full";
  /** Additional CSS classes */
  className?: string;
}

type SLAStatus = "on-track" | "warning" | "breached";

interface SLAInfo {
  status: SLAStatus;
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Clock;
}

const getSLAStatus = (days: number, threshold: number): SLAInfo => {
  const warningThreshold = threshold * 0.7;
  
  if (days <= warningThreshold) {
    return {
      status: "on-track",
      label: `${threshold - days}d left`,
      color: "text-green-500",
      bgColor: "bg-green-500/10 border-green-500/30",
      icon: CheckCircle,
    };
  }
  
  if (days <= threshold) {
    return {
      status: "warning",
      label: `${threshold - days}d left`,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10 border-yellow-500/30",
      icon: Clock,
    };
  }
  
  return {
    status: "breached",
    label: `${days - threshold}d over`,
    color: "text-red-500",
    bgColor: "bg-red-500/10 border-red-500/30",
    icon: AlertTriangle,
  };
};

export const SLATimer = memo(({
  daysSinceActivity,
  slaThreshold = 3,
  variant = "badge",
  className,
}: SLATimerProps) => {
  const sla = getSLAStatus(daysSinceActivity, slaThreshold);
  const Icon = sla.icon;

  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs", sla.color, className)}>
        <Icon className="w-3 h-3" />
        {sla.label}
      </span>
    );
  }

  if (variant === "full") {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border",
        sla.bgColor,
        className
      )}>
        <Icon className={cn("w-4 h-4", sla.color)} />
        <div className="flex flex-col">
          <span className={cn("text-sm font-medium", sla.color)}>
            {sla.label}
          </span>
          <span className="text-xs text-muted-foreground">
            SLA: {slaThreshold} days
          </span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "font-medium gap-1 cursor-default",
              sla.bgColor,
              sla.color,
              sla.status === "breached" && "animate-pulse",
              className
            )}
          >
            <Icon className="w-3 h-3" />
            {sla.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">
            {sla.status === "on-track" && "Response time is on track"}
            {sla.status === "warning" && "Approaching SLA deadline"}
            {sla.status === "breached" && "SLA has been breached - action needed"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

SLATimer.displayName = 'SLATimer';