import { useState, useEffect } from "react";
import { aiService } from '@/services/aiService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, AlertTriangle, Target, Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface CandidateIntelligenceDossierProps {
  candidateId: string;
  jobId: string;
}

export function CandidateIntelligenceDossier({ candidateId, jobId }: CandidateIntelligenceDossierProps) {
  const [loading, setLoading] = useState(false);
  const [dossier, setDossier] = useState<any>(null);

  const loadDossier = async () => {
    try {
      setLoading(true);
      const { dossier, rawData } = await aiService.generateCandidateDossier({
        candidateId,
        jobId
      });

      if (!dossier) throw new Error('No data returned');
      setDossier(dossier);
      toast.success("Intelligence dossier generated");
    } catch (error: any) {
      console.error('Error loading dossier:', error);
      toast.error("Failed to generate dossier");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDossier();
  }, [candidateId, jobId]);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Generating AI intelligence dossier...</p>
        </CardContent>
      </Card>
    );
  }

  if (!dossier) {
    return (
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <Button onClick={loadDossier} className="w-full">
            <Brain className="h-4 w-4 mr-2" />
            Generate Intelligence Dossier
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getRecommendationColor = (rec: string) => {
    if (rec.includes('strong_hire')) return 'bg-green-500';
    if (rec.includes('hire')) return 'bg-blue-500';
    if (rec.includes('no_hire')) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="space-y-4">
      {/* Executive Summary */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Intelligence Dossier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-background/60 border border-border/40">
            <p className="text-sm leading-relaxed">{dossier.executiveSummary}</p>
          </div>

          {/* Overall Scores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Overall Fit</span>
                <span className="text-sm font-semibold">{dossier.overallFitScore}%</span>
              </div>
              <Progress value={dossier.overallFitScore} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Technical</span>
                <span className="text-sm font-semibold">{dossier.technicalScore}%</span>
              </div>
              <Progress value={dossier.technicalScore} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Culture Fit</span>
                <span className="text-sm font-semibold">{dossier.cultureFitScore}%</span>
              </div>
              <Progress value={dossier.cultureFitScore} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Communication</span>
                <span className="text-sm font-semibold">{dossier.communicationScore}%</span>
              </div>
              <Progress value={dossier.communicationScore} className="h-2" />
            </div>
          </div>

          {/* Recommendation */}
          <div className="p-4 rounded-lg bg-background border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">AI Recommendation</span>
              <Badge className={getRecommendationColor(dossier.recommendation || '')}>
                {(dossier.recommendation || 'pending').replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{dossier.recommendationReasoning}</p>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Concerns */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Top Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(dossier.topStrengths || []).map((strength: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-yellow-500" />
              Key Concerns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(dossier.topConcerns || []).map((concern: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-1">!</span>
                  <span>{concern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Sentiment Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sentiment Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Overall Sentiment</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getSentimentColor(dossier.sentimentAnalysis?.overall || 'neutral')}>
                {(dossier.sentimentAnalysis?.overall || 'neutral').toUpperCase()}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {Math.round((dossier.sentimentAnalysis?.confidence || 0) * 100)}% confidence
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Key Indicators:</span>
            <div className="flex flex-wrap gap-2">
              {(dossier.sentimentAnalysis?.keyIndicators || []).map((indicator: string, idx: number) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {indicator}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Red Flags */}
      {dossier.redFlags && dossier.redFlags.length > 0 && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              Red Flags Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dossier.redFlags.map((flag: any, idx: number) => (
              <div key={idx} className="p-3 rounded-lg bg-background border border-red-500/20">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={(flag.severity || '') === 'high' ? 'destructive' : 'secondary'}>
                    {(flag.severity || 'unknown').toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((flag.confidence || 0) * 100)}% confidence
                  </span>
                </div>
                <p className="text-sm font-medium mb-1">{flag.flag}</p>
                <p className="text-xs text-muted-foreground">{flag.evidence}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Predictive Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-muted-foreground">Offer Acceptance</span>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={(dossier.predictedOfferAcceptance || 0) * 100} className="flex-1 h-2" />
                <span className="text-sm font-semibold">
                  {Math.round((dossier.predictedOfferAcceptance || 0) * 100)}%
                </span>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Retention Risk</span>
              <Badge variant="outline" className="mt-1">
                {(dossier.retentionRisk || 'unknown').toUpperCase()}
              </Badge>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Time to Productivity</span>
              <Badge variant="outline" className="mt-1">
                {(dossier.timeToProductivity || 'unknown').toUpperCase()}
              </Badge>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Interview Consensus</span>
              <Badge variant={dossier.interviewConsensus?.aligned ? 'default' : 'secondary'} className="mt-1">
                {dossier.interviewConsensus?.aligned ? 'ALIGNED' : 'MIXED'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Best Action */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm mb-1">Next Best Action</h4>
              <p className="text-sm text-muted-foreground">{dossier.nextBestAction}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={loadDossier} variant="outline" className="w-full" size="sm">
        <Sparkles className="h-4 w-4 mr-2" />
        Regenerate Analysis
      </Button>
    </div>
  );
}
