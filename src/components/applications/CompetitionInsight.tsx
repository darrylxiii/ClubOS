import { Users, Clock } from "lucide-react";

interface CompetitionInsightProps {
  totalCandidates: number;
  candidatesAhead: number;
  candidatesBehind: number;
  averageResponseTime?: string;
}

export function CompetitionInsight({ 
  totalCandidates,
  candidatesAhead,
  candidatesBehind,
  averageResponseTime = "2.5 days"
}: CompetitionInsightProps) {
  return (
    <div className="p-4 rounded-xl bg-card/30 backdrop-blur-[var(--blur-glass)] border border-border/20 h-full flex flex-col">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">Candidates</div>
      
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
          <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Total pool</div>
            <div className="text-sm font-medium">{totalCandidates} candidates</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">Ahead</div>
            <div className="text-sm font-medium text-amber-500">{candidatesAhead}</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground">Behind</div>
            <div className="text-sm font-medium text-green-500">{candidatesBehind}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
          <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Avg response time</div>
            <div className="text-sm font-medium">{averageResponseTime}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
