import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimelineDeadlinesProps {
  appliedDate?: string;
  nextStageName?: string;
  estimatedDaysToNext?: number;
  finalDecisionDate?: string;
}

export function TimelineDeadlines({ 
  appliedDate,
  nextStageName,
  estimatedDaysToNext = 0,
  finalDecisionDate 
}: TimelineDeadlinesProps) {
  const daysUntilDecision = finalDecisionDate 
    ? Math.ceil((new Date(finalDecisionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="p-6 rounded-2xl bg-card border border-border/50 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Timeline
        </span>
      </div>
      
      <div className="space-y-4 flex-1">
        {nextStageName && estimatedDaysToNext > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-1">Next:</div>
            <div className="text-xl font-bold">
              {nextStageName} <span className="text-muted-foreground font-normal">in ~{estimatedDaysToNext} days</span>
            </div>
          </div>
        )}
        
        {appliedDate && (
          <div className={nextStageName ? "pt-3 border-t border-border" : ""}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Applied:</span>
            </div>
            <div className="text-base font-semibold">
              {new Date(appliedDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
          </div>
        )}
        
        {finalDecisionDate && daysUntilDecision !== null && (
          <div className={(nextStageName || appliedDate) ? "pt-3 border-t border-border" : ""}>
            <div className="text-sm text-muted-foreground mb-1">Decision by:</div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold">
                {new Date(finalDecisionDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
              <Badge variant="secondary" className="text-xs">
                {daysUntilDecision}d left
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
