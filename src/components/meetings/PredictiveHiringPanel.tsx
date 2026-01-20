import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  ChevronDown, RefreshCw, Target, Zap, Users, Briefcase 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HiringSignal {
  name: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  description: string;
  weight: number;
}

interface PredictiveHiringPanelProps {
  meetingId?: string;
  recordingId?: string;
  candidateId?: string;
  compact?: boolean;
}

export function PredictiveHiringPanel({
  meetingId,
  recordingId,
  candidateId,
  compact = false
}: PredictiveHiringPanelProps) {
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<{
    overallScore: number;
    confidence: number;
    recommendation: 'strong_hire' | 'hire' | 'consider' | 'pass';
    signals: HiringSignal[];
    riskFactors: string[];
    strengths: string[];
  } | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    loadPrediction();
  }, [meetingId, recordingId, candidateId]);

  const loadPrediction = async () => {
    setLoading(true);
    try {
      // Try to get prediction from meeting recording
      if (recordingId) {
        const { data: recording } = await supabase
          .from('meeting_recordings_extended' as any)
          .select('*')
          .eq('id', recordingId)
          .single();

        const rec = recording as any;
        if (rec?.ai_summary) {
          const aiSummary = rec.ai_summary as Record<string, any>;
          const candidateEval = aiSummary.candidateEvaluation || {};
          const decisionGuidance = aiSummary.decisionGuidance || {};
          
          // Build prediction from AI analysis
          const signals: HiringSignal[] = [
            {
              name: 'Technical Competence',
              score: mapFitToScore(candidateEval.technicalFit || 'fair'),
              trend: 'stable',
              description: 'Based on technical discussion quality',
              weight: 0.25
            },
            {
              name: 'Communication',
              score: mapFitToScore(candidateEval.communicationFit || 'fair'),
              trend: 'stable',
              description: 'Clarity and articulation of ideas',
              weight: 0.2
            },
            {
              name: 'Cultural Alignment',
              score: mapFitToScore(candidateEval.cultureFit || 'fair'),
              trend: 'stable',
              description: 'Values and work style compatibility',
              weight: 0.2
            },
            {
              name: 'Engagement Level',
              score: rec.speaking_metrics?.engagement_score || 70,
              trend: 'stable',
              description: 'Active participation and interest',
              weight: 0.15
            },
            {
              name: 'Experience Match',
              score: mapFitToScore(candidateEval.experienceFit || 'fair'),
              trend: 'stable',
              description: 'Relevant experience for the role',
              weight: 0.2
            }
          ];

          const overallScore = signals.reduce((acc, s) => acc + (s.score * s.weight), 0);
          
          setPrediction({
            overallScore: Math.round(overallScore),
            confidence: decisionGuidance.confidenceLevel || 0.7,
            recommendation: mapScoreToRecommendation(overallScore),
            signals,
            riskFactors: candidateEval.areasForGrowth || [],
            strengths: candidateEval.strengths || []
          });
        }
      }
    } catch (error) {
      console.error('Error loading prediction:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapFitToScore = (fit: string): number => {
    switch (fit.toLowerCase()) {
      case 'excellent': return 95;
      case 'good': return 80;
      case 'fair': return 60;
      case 'poor': return 35;
      default: return 50;
    }
  };

  const mapScoreToRecommendation = (score: number): 'strong_hire' | 'hire' | 'consider' | 'pass' => {
    if (score >= 85) return 'strong_hire';
    if (score >= 70) return 'hire';
    if (score >= 50) return 'consider';
    return 'pass';
  };

  const getRecommendationConfig = (rec: string) => {
    switch (rec) {
      case 'strong_hire':
        return { 
          label: 'Strong Hire', 
          color: 'bg-green-500', 
          textColor: 'text-green-500',
          icon: CheckCircle2 
        };
      case 'hire':
        return { 
          label: 'Hire', 
          color: 'bg-blue-500', 
          textColor: 'text-blue-500',
          icon: TrendingUp 
        };
      case 'consider':
        return { 
          label: 'Consider', 
          color: 'bg-amber-500', 
          textColor: 'text-amber-500',
          icon: AlertTriangle 
        };
      case 'pass':
        return { 
          label: 'Pass', 
          color: 'bg-rose-500', 
          textColor: 'text-rose-500',
          icon: TrendingDown 
        };
      default:
        return { 
          label: 'Unknown', 
          color: 'bg-muted', 
          textColor: 'text-muted-foreground',
          icon: Target 
        };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Analyzing hiring signals...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return null;
  }

  const recConfig = getRecommendationConfig(prediction.recommendation);
  const RecIcon = recConfig.icon;

  if (compact) {
    return (
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <Card className="border-primary/20">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Hiring Prediction
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={cn('text-xs', recConfig.color)}>
                    {recConfig.label}
                  </Badge>
                  <span className={cn('font-bold', getScoreColor(prediction.overallScore))}>
                    {prediction.overallScore}%
                  </span>
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform",
                    expanded && "rotate-180"
                  )} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {renderSignals()}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  function renderSignals() {
    return (
      <div className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            recConfig.color + '/10'
          )}>
            <RecIcon className={cn('h-8 w-8', recConfig.textColor)} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn('text-3xl font-bold', getScoreColor(prediction!.overallScore))}>
                {prediction!.overallScore}%
              </span>
              <span className="text-sm text-muted-foreground">
                overall match
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={recConfig.textColor}>
                {recConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {Math.round(prediction!.confidence * 100)}% confidence
              </span>
            </div>
          </div>
        </div>

        {/* Individual Signals */}
        <div className="space-y-3">
          {prediction!.signals.map((signal) => (
            <div key={signal.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{signal.name}</span>
                <span className={getScoreColor(signal.score)}>{signal.score}%</span>
              </div>
              <Progress 
                value={signal.score} 
                className="h-1.5"
              />
              <p className="text-xs text-muted-foreground">{signal.description}</p>
            </div>
          ))}
        </div>

        {/* Strengths & Risks */}
        <div className="grid grid-cols-2 gap-4">
          {prediction!.strengths.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium flex items-center gap-1">
                <Zap className="h-3 w-3 text-green-500" />
                Strengths
              </h5>
              <ul className="space-y-1">
                {prediction!.strengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {prediction!.riskFactors.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                Growth Areas
              </h5>
              <ul className="space-y-1">
                {prediction!.riskFactors.slice(0, 3).map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Predictive Hiring Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderSignals()}
      </CardContent>
    </Card>
  );
}
