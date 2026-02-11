import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, TrendingUp, AlertCircle, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExecutiveBriefingCardProps {
  candidateId: string;
  jobId: string;
  compact?: boolean;
}

export function ExecutiveBriefingCard({ candidateId, jobId, compact = false }: ExecutiveBriefingCardProps) {
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<any>(null);

  const loadBriefing = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-executive-briefing', {
        body: { candidateId, jobId }
      });

      if (error) throw error;
      setBriefing(data.briefing);
      toast.success("Executive briefing generated");
    } catch (error: unknown) {
      console.error('Error loading briefing:', error);
      toast.error("Failed to generate briefing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!compact) {
      loadBriefing();
    }
  }, [candidateId, jobId, compact]);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="pt-6 flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Generating 30-second briefing...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!briefing) {
    return (
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <Button onClick={loadBriefing} variant="outline" className="w-full" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Generate Executive Briefing
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'hire': return 'bg-green-500';
      case 'no_hire': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'high': return 'text-green-500';
      case 'low': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  if (compact) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">AI Quick Brief</span>
            </div>
            <Clock className="h-3 w-3 text-muted-foreground" />
          </div>
          {!briefing ? (
            <Button onClick={loadBriefing} variant="ghost" size="sm" className="w-full h-8">
              Generate
            </Button>
          ) : (
            <>
              <p className="text-xs leading-relaxed">{briefing.headline}</p>
              <div className="flex items-center gap-2">
                <Badge className={`${getRecommendationColor(briefing.aiRecommendation)} text-[10px] px-1.5 py-0`}>
                  {briefing.aiRecommendation.replace('_', ' ').toUpperCase()}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {briefing.teamConsensus.score}% consensus
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Executive Briefing
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {briefing.readTime}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Headline */}
        <div className="p-3 rounded-lg bg-background/60 border border-border/40">
          <p className="text-sm font-medium leading-relaxed">{briefing.headline}</p>
        </div>

        {/* Recommendation */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">AI Recommendation</p>
            <p className="text-sm">{briefing.aiRecommendationReasoning}</p>
          </div>
              <Badge className={getRecommendationColor(briefing.aiRecommendation) + " ml-3"}>
                {briefing.aiRecommendation.replace('_', ' ').toUpperCase()}
              </Badge>
        </div>

        {/* Team Consensus */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-background border border-border">
            <p className="text-xs text-muted-foreground mb-1">Consensus</p>
            <p className="text-lg font-semibold">{briefing.teamConsensus.score}%</p>
          </div>
          <div className="p-3 rounded-lg bg-background border border-border">
            <p className="text-xs text-muted-foreground mb-1">Confidence</p>
            <Badge variant="outline" className={getConfidenceColor(briefing.teamConsensus.confidence)}>
              {briefing.teamConsensus.confidence.toUpperCase()}
            </Badge>
          </div>
          <div className="p-3 rounded-lg bg-background border border-border">
            <p className="text-xs text-muted-foreground mb-1">Alignment</p>
            <Badge variant="outline">
              {briefing.teamConsensus.alignment.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Strengths & Concerns */}
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium text-green-500">
              <TrendingUp className="h-3 w-3" />
              Top 3 Strengths
            </div>
            <ul className="space-y-1">
              {briefing.topThreeStrengths.map((strength: string, idx: number) => (
                <li key={idx} className="text-xs flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium text-yellow-500">
              <AlertCircle className="h-3 w-3" />
              Top 3 Concerns
            </div>
            <ul className="space-y-1">
              {briefing.topThreeConcerns.map((concern: string, idx: number) => (
                <li key={idx} className="text-xs flex items-start gap-1.5">
                  <span className="text-yellow-500 mt-0.5">!</span>
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Risk Factors */}
        {briefing.riskFactors && briefing.riskFactors.length > 0 && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-xs font-medium text-red-500 mb-2">Risk Factors</p>
            <ul className="space-y-1">
              {briefing.riskFactors.map((risk: string, idx: number) => (
                <li key={idx} className="text-xs text-red-500/80">• {risk}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Step */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs font-medium text-primary mb-1">Next Step</p>
          <p className="text-sm">{briefing.nextStep}</p>
        </div>

        {/* Opportunity Cost */}
        {briefing.opportunityCost && (
          <div className="p-3 rounded-lg bg-background/60 border border-border/40">
            <p className="text-xs font-medium mb-1">Opportunity Cost</p>
            <p className="text-xs text-muted-foreground italic">{briefing.opportunityCost}</p>
          </div>
        )}

        <Button onClick={loadBriefing} variant="outline" size="sm" className="w-full">
          <Sparkles className="h-4 w-4 mr-2" />
          Regenerate Briefing
        </Button>
      </CardContent>
    </Card>
  );
}
