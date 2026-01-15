/**
 * Interview Scorecard Component
 * 
 * Displays aggregated interview intelligence from all interviews
 * for a candidate. Shows scores, strengths, weaknesses, and AI recommendation.
 * Auto-fetches data based on candidateId.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Video, 
  ThumbsUp, 
  ThumbsDown, 
  TrendingUp,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface InterviewScorecardProps {
  candidateId: string;
}

export function InterviewScorecard({ candidateId }: InterviewScorecardProps) {
  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate-interview-data', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('interview_score_avg, interview_count, ai_recommendation, key_strengths_aggregated, key_weaknesses_aggregated, last_interview_at')
        .eq('id', candidateId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!candidateId,
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const interviewCount = candidate?.interview_count || 0;
  const interviewScoreAvg = candidate?.interview_score_avg;
  const aiRecommendation = candidate?.ai_recommendation;
  const keyStrengths = candidate?.key_strengths_aggregated as string[] | null;
  const keyWeaknesses = candidate?.key_weaknesses_aggregated as string[] | null;
  const lastInterviewAt = candidate?.last_interview_at;

  if (interviewCount === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Video className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No interviews recorded yet</p>
          <p className="text-sm text-muted-foreground/70">Interview data will appear here after meetings</p>
        </CardContent>
      </Card>
    );
  }

  const getRecommendationIcon = () => {
    switch (aiRecommendation?.toLowerCase()) {
      case 'advance':
      case 'hire':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'reject':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'reconsider':
        return <HelpCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <HelpCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRecommendationColor = () => {
    switch (aiRecommendation?.toLowerCase()) {
      case 'advance':
      case 'hire':
        return 'bg-green-500/10 text-green-700 border-green-500/30';
      case 'reject':
        return 'bg-red-500/10 text-red-700 border-red-500/30';
      case 'reconsider':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const scoreColor = () => {
    if (!interviewScoreAvg) return 'text-muted-foreground';
    if (interviewScoreAvg >= 70) return 'text-green-500';
    if (interviewScoreAvg >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Interview Intelligence
          </span>
          <Badge variant="outline" className="font-normal">
            {interviewCount} interview{interviewCount !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score and Recommendation */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className={`text-3xl font-bold ${scoreColor()}`}>
              {interviewScoreAvg?.toFixed(0) || '--'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Interview Score</p>
            <Progress 
              value={interviewScoreAvg || 0} 
              className="mt-2 h-1.5" 
            />
          </div>
          <div className={`p-4 rounded-lg text-center border ${getRecommendationColor()}`}>
            <div className="flex items-center justify-center gap-2">
              {getRecommendationIcon()}
              <p className="text-lg font-semibold capitalize">
                {aiRecommendation || 'Pending'}
              </p>
            </div>
            <p className="text-xs mt-1 opacity-70">AI Recommendation</p>
          </div>
        </div>

        {/* Last Interview */}
        {lastInterviewAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last interview {formatDistanceToNow(new Date(lastInterviewAt), { addSuffix: true })}
          </div>
        )}

        {/* Strengths */}
        {keyStrengths && keyStrengths.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2 text-green-600">
              <ThumbsUp className="h-4 w-4" />
              Key Strengths
            </p>
            <div className="flex flex-wrap gap-2">
              {keyStrengths.slice(0, 5).map((strength, i) => (
                <Badge key={i} variant="outline" className="bg-green-500/10 border-green-500/30 text-green-700">
                  {strength}
                </Badge>
              ))}
              {keyStrengths.length > 5 && (
                <Badge variant="outline" className="bg-muted">
                  +{keyStrengths.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Weaknesses */}
        {keyWeaknesses && keyWeaknesses.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2 text-red-600">
              <ThumbsDown className="h-4 w-4" />
              Areas for Improvement
            </p>
            <div className="flex flex-wrap gap-2">
              {keyWeaknesses.slice(0, 5).map((weakness, i) => (
                <Badge key={i} variant="outline" className="bg-red-500/10 border-red-500/30 text-red-700">
                  {weakness}
                </Badge>
              ))}
              {keyWeaknesses.length > 5 && (
                <Badge variant="outline" className="bg-muted">
                  +{keyWeaknesses.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Trend Indicator */}
        {interviewCount > 1 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Performance trend based on {interviewCount} interviews</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
