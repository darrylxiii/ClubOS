import { Users, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface CompetitionInsightProps {
  totalCandidates: number;
  candidatesAhead?: number;
  candidatesBehind?: number;
  averageScore?: number;
}

export function CompetitionInsight({ 
  totalCandidates,
  candidatesAhead = 0,
  candidatesBehind = 0,
  averageScore = 0
}: CompetitionInsightProps) {
  const [isOpen, setIsOpen] = useState(false);
  const yourPosition = candidatesAhead + 1;
  const percentile = totalCandidates > 0 ? Math.round(((totalCandidates - candidatesAhead) / totalCandidates) * 100) : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="p-6 rounded-2xl bg-card border border-border/50 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Competition
            </span>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              Details
              <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <div className="grid grid-cols-3 gap-4 flex-1">
          <div className="text-center">
            <div className="text-3xl font-bold mb-1">{totalCandidates}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-1">#{yourPosition}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Your Rank</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{percentile}%</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Percentile</div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Candidates ahead:</span>
              <span className="font-semibold">{candidatesAhead}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Candidates behind:</span>
              <span className="font-semibold">{candidatesBehind}</span>
            </div>
            {averageScore > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Avg. score:</span>
                <span className="font-semibold">{averageScore.toFixed(1)}/10</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
