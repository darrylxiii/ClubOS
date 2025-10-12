import { Users, TrendingUp, Award, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

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
      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Competition</span>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <span className="text-xs mr-1">Details</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalCandidates}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">#{yourPosition}</div>
            <div className="text-xs text-muted-foreground">Your Rank</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{percentile}%</div>
            <div className="text-xs text-muted-foreground">Percentile</div>
          </div>
        </div>

        <CollapsibleContent>
          <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
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
            <div className="mt-3 p-2 rounded bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Focus on stage preparation and timely responses to improve your ranking.
                </p>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
