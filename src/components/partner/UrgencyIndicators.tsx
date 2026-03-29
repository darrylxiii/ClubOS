import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  Eye,
  Zap
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('common');
  const indicators = [];

  // High urgency: Pending offer from another company
  if (hasPendingOffer) {
    indicators.push({
      icon: AlertTriangle,
      label: t('partnerSection.pendingOffer', 'Pending Offer'),
      variant: "destructive" as const,
      tooltip: t('partnerSection.pendingOfferTooltip', 'Candidate has a pending offer from another company')
    });
  }

  // Medium urgency: Notice period ending soon
  if (noticeEndsInDays !== undefined && noticeEndsInDays <= 30) {
    indicators.push({
      icon: Clock,
      label: t('partnerSection.noticeDays', '{{days}}d notice', { days: noticeEndsInDays }),
      variant: noticeEndsInDays <= 14 ? "destructive" as const : "default" as const,
      tooltip: t('partnerSection.noticePeriodEnds', 'Notice period ends in {{days}} days', { days: noticeEndsInDays })
    });
  }

  // High engagement: Many profile views
  if (profileViews >= 5) {
    indicators.push({
      icon: TrendingUp,
      label: t('partnerSection.viewCount', '{{count}} views', { count: profileViews }),
      variant: "secondary" as const,
      tooltip: t('partnerSection.profileViewedTimes', 'Profile viewed {{count}} times by other companies', { count: profileViews })
    });
  }

  // Stage duration vs average
  if (daysInStage > avgDaysInStage * 1.5) {
    indicators.push({
      icon: Zap,
      label: t('partnerSection.daysInStage', '{{days}}d in stage', { days: daysInStage }),
      variant: "default" as const,
      tooltip: t('partnerSection.daysInStageAvg', '{{days}} days in current stage (avg: {{avg}})', { days: daysInStage, avg: avgDaysInStage })
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
