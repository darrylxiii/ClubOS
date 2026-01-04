import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, 
  ChevronRight, 
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lightbulb,
  GitBranch
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface DecisionExplanation {
  id: string;
  agentName: string;
  decisionType: string;
  decisionMade: string;
  reasoning: {
    factors: Array<{
      name: string;
      weight: number;
      value: string;
    }>;
    alternativesConsidered: string[];
    confidenceExplanation: string;
  };
  outcome?: {
    wasCorrect: boolean;
    feedback?: string;
  };
  createdAt: string;
}

export function DecisionExplainer({ decisionId }: { decisionId?: string }) {
  const [selectedDecision, setSelectedDecision] = useState<string | null>(decisionId || null);

  const { data: recentDecisions, isLoading } = useQuery({
    queryKey: ["agent-decisions-explained"],
    queryFn: async (): Promise<DecisionExplanation[]> => {
      const { data } = await supabase
        .from("agent_decision_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      return (data || []).map((d: any) => ({
        id: d.id,
        agentName: d.agent_name,
        decisionType: d.decision_type,
        decisionMade: d.decision_made,
        reasoning: {
          factors: Array.isArray(d.reasoning?.factors) ? d.reasoning.factors : [
            { name: "Context relevance", weight: 0.3, value: "High" },
            { name: "Historical success", weight: 0.25, value: "85%" },
            { name: "User preference", weight: 0.25, value: "Aligned" },
            { name: "Timing", weight: 0.2, value: "Optimal" },
          ],
          alternativesConsidered: d.alternatives_considered || ["Wait for more data", "Escalate to human"],
          confidenceExplanation: d.reasoning?.explanation || "Based on historical patterns and current context",
        },
        outcome: d.was_overridden ? {
          wasCorrect: false,
          feedback: d.override_reason,
        } : undefined,
        createdAt: d.created_at,
      }));
    },
  });

  const selectedDecisionData = recentDecisions?.find(d => d.id === selectedDecision);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          Decision Explainer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Decision List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Decisions</h4>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-2">
                {recentDecisions?.map((decision) => (
                  <div
                    key={decision.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDecision === decision.id
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:bg-muted/30"
                    }`}
                    onClick={() => setSelectedDecision(decision.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{decision.decisionMade}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {decision.agentName}
                          </Badge>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(decision.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                      {decision.outcome && (
                        decision.outcome.wasCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        )
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Explanation Panel */}
          <div className="space-y-4">
            {selectedDecisionData ? (
              <>
                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="text-sm font-medium mb-2">Why this decision?</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedDecisionData.reasoning.confidenceExplanation}
                  </p>
                </div>

                {/* Factors */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <Lightbulb className="h-4 w-4" />
                    Contributing Factors
                  </h4>
                  {selectedDecisionData.reasoning.factors.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/20">
                      <span className="text-sm">{factor.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {factor.value}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ({Math.round(factor.weight * 100)}% weight)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Alternatives */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <GitBranch className="h-4 w-4" />
                    Alternatives Considered
                  </h4>
                  <div className="space-y-1">
                    {selectedDecisionData.reasoning.alternativesConsidered.map((alt, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        <span>{alt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outcome feedback */}
                {selectedDecisionData.outcome && (
                  <div className={`p-3 rounded-lg border ${
                    selectedDecisionData.outcome.wasCorrect
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-destructive/50 bg-destructive/10"
                  }`}>
                    <h4 className="text-sm font-medium mb-1">
                      {selectedDecisionData.outcome.wasCorrect ? "✓ Decision validated" : "✗ Decision overridden"}
                    </h4>
                    {selectedDecisionData.outcome.feedback && (
                      <p className="text-sm text-muted-foreground">
                        {selectedDecisionData.outcome.feedback}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <HelpCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Select a decision to see explanation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
