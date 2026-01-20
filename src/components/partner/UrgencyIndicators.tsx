import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Eye,
  Zap
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface UrgencyIndicatorsProps {
  hasPendingOffer?: boolean;
  noticeEndsInDays?: number;
  profileViews?: number;
  daysInStage?: number;
  avgDaysInStage?: number;
}

export function UrgencyIndicators({
  hasPendingOffer,
  noticeEndsInDays,
  profileViews = 0,
  daysInStage = 0,
  avgDaysInStage = 7
}: UrgencyIndicatorsProps) {
  const indicators = [];

  // High urgency: Pending offer from another company
  if (hasPendingOffer) {
    indicators.push({
      icon: AlertTriangle,
      label: "Pending Offer",
      variant: "destructive" as const,
      tooltip: "Candidate has a pending offer from another company"
    });
  }

  // Medium urgency: Notice period ending soon
  if (noticeEndsInDays !== undefined && noticeEndsInDays <= 30) {
    indicators.push({
      icon: Clock,
      label: `${noticeEndsInDays}d notice`,
      variant: noticeEndsInDays <= 14 ? "destructive" as const : "default" as const,
      tooltip: `Notice period ends in ${noticeEndsInDays} days`
    });
  }

  // High engagement: Many profile views
  if (profileViews >= 5) {
    indicators.push({
      icon: TrendingUp,
      label: `${profileViews} views`,
      variant: "secondary" as const,
      tooltip: `Profile viewed ${profileViews} times by other companies`
    });
  }

  // Stage duration vs average
  if (daysInStage > avgDaysInStage * 1.5) {
    indicators.push({
      icon: Zap,
      label: `${daysInStage}d in stage`,
      variant: "default" as const,
      tooltip: `${daysInStage} days in current stage (avg: ${avgDaysInStage})`
    });
  }

  if (indicators.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5 flex-wrap">
        {indicators.map((indicator, index) => {
          const Icon = indicator.icon;
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Badge 
                  variant={indicator.variant}
                  className="gap-1 text-xs px-2 py-0.5 cursor-help"
                >
                  <Icon className="w-3 h-3" />
                  {indicator.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{indicator.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
