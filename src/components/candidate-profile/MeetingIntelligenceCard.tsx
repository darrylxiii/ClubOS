/**
 * Meeting Intelligence Card
 * 
 * Displays interview performance insights from meeting analysis
 * directly on the candidate profile.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  Video,
  Star,
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
  Clock,
  ChevronRight,
  Brain,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface MeetingIntelligenceCardProps {
  candidateId: string;
}

interface InterviewInsight {
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  keyMoments: Array<{
    timestamp: string;
    description: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | null;
}

export function MeetingIntelligenceCard({ candidateId }: MeetingIntelligenceCardProps) {
  const [insights, setInsights] = useState<InterviewInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [aggregateScore, setAggregateScore] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMeetingIntelligence();
  }, [candidateId]);

  const fetchMeetingIntelligence = async () => {
    try {
      // Fetch meetings for this candidate with analysis
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          scheduled_start,
          meeting_recording_analysis (
            id,
            ai_analysis,
            created_at
          )
        `)
        .eq('candidate_id', candidateId)
        .not('meeting_recording_analysis', 'is', null)
        .order('scheduled_start', { ascending: false })
        .limit(5);

      if (error) throw error;

      const parsedInsights: InterviewInsight[] = [];
      let totalScore = 0;
      let scoreCount = 0;

      meetings?.forEach((meeting: any) => {
        const analysis = meeting.meeting_recording_analysis?.[0];
        if (!analysis?.ai_analysis) return;

        const aiData = analysis.ai_analysis as any;

        // Extract key data from AI analysis
        const overallScore = 
          aiData.candidate_evaluation?.overall_score ||
          aiData.overall_impression?.score ||
          aiData.interview_score ||
          0;

        if (overallScore > 0) {
          totalScore += overallScore;
          scoreCount++;
        }

        parsedInsights.push({
          meetingId: meeting.id,
          meetingTitle: meeting.title || 'Interview Session',
          meetingDate: meeting.scheduled_start,
          overallScore,
          strengths: aiData.candidate_evaluation?.strengths || 
                     aiData.strengths || 
                     [],
          areasForImprovement: aiData.candidate_evaluation?.areas_for_improvement ||
                               aiData.improvements ||
                               [],
          keyMoments: aiData.key_moments || [],
          recommendation: aiData.decision_guidance?.recommendation ||
                          aiData.recommendation ||
                          null,
        });
      });

      setInsights(parsedInsights);
      setAggregateScore(scoreCount > 0 ? Math.round(totalScore / scoreCount) : null);
    } catch (error) {
      console.error('Error fetching meeting intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No interview recordings analyzed yet</p>
        </CardContent>
      </Card>
    );
  }

  const getRecommendationBadge = (rec: string | null) => {
    switch (rec) {
      case 'strong_yes':
        return <Badge className="bg-green-500">Strong Hire</Badge>;
      case 'yes':
        return <Badge className="bg-emerald-500">Proceed</Badge>;
      case 'maybe':
        return <Badge className="bg-yellow-500">Consider</Badge>;
      case 'no':
        return <Badge className="bg-red-500">Pass</Badge>;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Interview Intelligence
        </CardTitle>
        {aggregateScore !== null && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Avg Score</span>
            <span className={`text-2xl font-bold ${getScoreColor(aggregateScore)}`}>
              {aggregateScore}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aggregate Insights */}
        {insights.length > 1 && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Video className="h-4 w-4" />
                Total Interviews
              </div>
              <p className="text-2xl font-bold">{insights.length}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Performance Trend
              </div>
              <p className="text-sm font-medium text-green-500 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Improving
              </p>
            </div>
          </div>
        )}

        {/* Individual Interview Insights */}
        <div className="space-y-3">
          {insights.slice(0, 3).map((insight) => (
            <div
              key={insight.meetingId}
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/meeting-insights/${insight.meetingId}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{insight.meetingTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(insight.meetingDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getRecommendationBadge(insight.recommendation)}
                  <span className={`text-lg font-bold ${getScoreColor(insight.overallScore)}`}>
                    {insight.overallScore}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <Progress 
                value={insight.overallScore} 
                className="h-2 mb-3"
              />

              {/* Quick insights */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {insight.strengths.slice(0, 2).map((strength, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-green-600">
                    <ThumbsUp className="h-3 w-3" />
                    <span className="truncate">{strength}</span>
                  </div>
                ))}
                {insight.areasForImprovement.slice(0, 2).map((area, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="truncate">{area}</span>
                  </div>
                ))}
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-2 text-xs"
              >
                View Full Analysis <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          ))}
        </div>

        {/* View All Button */}
        {insights.length > 3 && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate(`/meeting-intelligence?candidate=${candidateId}`)}
          >
            View All {insights.length} Interviews
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
