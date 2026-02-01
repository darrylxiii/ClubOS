import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Lightbulb, MessageSquare, TrendingUp, Megaphone } from "lucide-react";

export interface NextActionData {
  text: string;
  urgent: boolean;
}

interface NextActionBadgeProps {
  action: NextActionData | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

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

// Determine icon based on action text
const getIcon = (text: string) => {
  if (text.includes('awaiting feedback')) return MessageSquare;
  if (text.includes('promotion') || text.includes('Needs promotion')) return Megaphone;
  if (text.includes('performing') || text.includes('High performing')) return TrendingUp;
  if (text.includes('stalled')) return AlertCircle;
  return AlertCircle;
};

/**
 * Next Action Badge - matches styling of JobStatusBadge and ClubSyncBadge
 */
export const NextActionBadge = memo(({
  action,
  size = "sm",
  showTooltip = true,
  className,
}: NextActionBadgeProps) => {
  if (!action) return null;

  const Icon = action.urgent ? getIcon(action.text) : Lightbulb;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border gap-1.5 inline-flex items-center transition-all",
        action.urgent 
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" 
          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {action.text}
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
          <p className="text-sm">
            {action.urgent 
              ? "This role needs attention. Take action to keep the pipeline moving." 
              : "This role is performing well. Keep up the good work!"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

NextActionBadge.displayName = "NextActionBadge";
