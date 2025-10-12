import { Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TimelineDeadlinesProps {
  nextStageName?: string;
  estimatedDaysToNext?: number;
  finalDecisionDate?: string;
}

export function TimelineDeadlines({ 
  nextStageName,
  estimatedDaysToNext = 0,
  finalDecisionDate 
}: TimelineDeadlinesProps) {
  const daysUntilDecision = finalDecisionDate 
    ? Math.ceil((new Date(finalDecisionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isUrgent = daysUntilDecision !== null && daysUntilDecision <= 7;

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      isUrgent 
        ? "bg-orange-500/5 border-orange-500/30" 
        : "bg-muted/30 border-border/50"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isUrgent ? "bg-orange-500/10" : "bg-background"
        )}>
          <Clock className={cn(
            "w-4 h-4",
            isUrgent ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
          )} />
        </div>
        
        <div className="flex-1 space-y-2">
          {nextStageName && estimatedDaysToNext > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Next: </span>
              <span className="font-semibold">{nextStageName}</span>
              <span className="text-muted-foreground"> in ~{estimatedDaysToNext} days</span>
            </div>
          )}
          
          {finalDecisionDate && daysUntilDecision !== null && (
            <div className="flex items-center gap-2">
              {isUrgent && <AlertCircle className="w-3 h-3 text-orange-600 dark:text-orange-400" />}
              <div className="text-xs">
                <span className="text-muted-foreground">Decision by: </span>
                <span className="font-semibold">
                  {new Date(finalDecisionDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                <Badge 
                  variant={isUrgent ? "destructive" : "secondary"}
                  className="ml-2 text-[10px] px-1.5 py-0"
                >
                  {daysUntilDecision}d left
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
