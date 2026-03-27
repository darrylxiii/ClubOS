/**
 * Meeting Cost Badge
 * Estimates meeting cost based on duration and participant count.
 * Uses an average hourly rate assumption for ROI awareness.
 */

import { DollarSign } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

interface MeetingCostBadgeProps {
  durationSeconds: number | null;
  participantCount: number;
  /** Average hourly cost per participant in EUR. Defaults to 75. */
  avgHourlyRate?: number;
}

export function MeetingCostBadge({
  durationSeconds,
  participantCount,
  avgHourlyRate = 75,
}: MeetingCostBadgeProps) {
  const { t } = useTranslation("meetings");
  if (!durationSeconds || participantCount < 1) return null;

  const hours = durationSeconds / 3600;
  const totalCost = hours * participantCount * avgHourlyRate;

  if (totalCost < 1) return null;

  const formatted = totalCost < 100
    ? `€${totalCost.toFixed(0)}`
    : `€${Math.round(totalCost).toLocaleString()}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            {formatted}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-48">
          <p>
            {t('cost.estimated', { participants: participantCount, minutes: Math.round(hours * 60), rate: avgHourlyRate })}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
