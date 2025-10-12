import { Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimelineDeadlinesProps {
  appliedDate: string;
  nextStageName?: string;
  estimatedDaysToNext?: number;
  finalDecisionDate?: string;
}

export function TimelineDeadlines({ 
  appliedDate,
  nextStageName,
  estimatedDaysToNext = 5,
  finalDecisionDate 
}: TimelineDeadlinesProps) {
  const appliedDateFormatted = new Date(appliedDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const decisionDateFormatted = finalDecisionDate 
    ? new Date(finalDecisionDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  const daysUntilDecision = finalDecisionDate
    ? Math.ceil((new Date(finalDecisionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 h-full flex flex-col">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Timeline</div>
      
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Applied</div>
            <div className="text-sm font-semibold">{appliedDateFormatted}</div>
          </div>
        </div>

        {nextStageName && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Next: {nextStageName}</div>
              <div className="text-sm font-semibold">~{estimatedDaysToNext} days</div>
            </div>
          </div>
        )}

        {decisionDateFormatted && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Decision by</div>
              <div className="text-sm font-semibold">{decisionDateFormatted}</div>
              {daysUntilDecision !== null && daysUntilDecision > 0 && (
                <Badge variant="secondary" className="text-[10px] mt-1">
                  {daysUntilDecision} days left
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
