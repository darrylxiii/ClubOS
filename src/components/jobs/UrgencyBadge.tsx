import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flame, Sparkles, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { UrgencyLevel, getUrgencyLevel } from "@/lib/jobFormatters";

interface UrgencyBadgeProps {
  daysOpen: number;
  lastActivityDaysAgo: number;
  applicantsCount?: number;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

const urgencyIcons: Record<UrgencyLevel, React.ComponentType<{ className?: string }> | null> = {
  critical: Flame,
  high: AlertTriangle,
  medium: Clock,
  low: Sparkles,
  none: null,
};

const urgencyTooltips: Record<UrgencyLevel, string> = {
  critical: "This role needs immediate attention - low applicants and no recent activity",
  high: "Pipeline activity is low - consider promoting this role",
  medium: "Check the pipeline - some candidates may need follow-up",
  low: "New role - pipeline is building",
  none: "",
};

export const UrgencyBadge = memo(({
  daysOpen,
  lastActivityDaysAgo,
  applicantsCount = 0,
  size = "md",
  showTooltip = true,
  className,
}: UrgencyBadgeProps) => {
  const urgency = getUrgencyLevel(daysOpen, lastActivityDaysAgo, applicantsCount);
  
  if (urgency.level === 'none') return null;
  
  const Icon = urgencyIcons[urgency.level];
  if (!Icon) return null;

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
        urgency.bgColor,
        urgency.color,
        urgency.borderColor,
        sizeClasses[size],
        urgency.level === 'critical' && "animate-pulse",
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {urgency.label}
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
          <p className="text-sm">{urgencyTooltips[urgency.level]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

UrgencyBadge.displayName = "UrgencyBadge";
