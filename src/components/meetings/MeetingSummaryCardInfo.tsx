/**
 * Meeting Summary Card Info
 * Displays duration, participant count, and AI-extracted topics on recording cards.
 */

import { Clock, Users, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MeetingCostBadge } from './MeetingCostBadge';

interface MeetingSummaryCardInfoProps {
  durationSeconds: number | null;
  participantCount: number;
  topics?: string[];
}

export function MeetingSummaryCardInfo({
  durationSeconds,
  participantCount,
  topics,
}: MeetingSummaryCardInfoProps) {
  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
      {durationSeconds != null && durationSeconds > 0 && (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDuration(durationSeconds)}
        </span>
      )}
      {participantCount > 0 && (
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {participantCount}
        </span>
      )}
      <MeetingCostBadge
        durationSeconds={durationSeconds}
        participantCount={participantCount}
      />
      {topics && topics.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <Tag className="h-3 w-3 flex-shrink-0" />
          {topics.slice(0, 3).map((topic) => (
            <Badge key={topic} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {topic}
            </Badge>
          ))}
          {topics.length > 3 && (
            <span className="text-[10px]">+{topics.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}
