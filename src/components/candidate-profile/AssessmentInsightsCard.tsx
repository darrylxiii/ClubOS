/**
 * Assessment Insights Card
 * 
 * Displays assessment scores and insights on candidate profiles,
 * integrating with ML matching for enhanced recommendations.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import {
  Brain,
  Target,
  Sparkles,
  ChevronRight,
  Award,
  TrendingUp,
  Zap,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface AssessmentInsightsCardProps {
  candidateId: string;
  userId?: string;
}

interface AssessmentResult {
  id: string;
  assessmentType: string;
  assessmentName: string;
  score: number | null;
  completedAt: string;
  resultsData: any;
  isLatest: boolean;
}

interface AggregatedInsights {
  overallScore: number;
  completedAssessments: number;
  topStrengths: string[];
  developmentAreas: string[];
  personalityType?: string;
  workStyle?: string;
}

const ASSESSMENT_ICONS: Record<string, typeof Brain> = {
  'personality': Brain,
  'skills': Target,
  'cognitive': Zap,
  'values': Award,
  'situational': Sparkles,
};

const ASSESSMENT_COLORS: Record<string, string> = {
  'personality': 'bg-purple-500',
  'skills': 'bg-blue-500',
  'cognitive': 'bg-amber-500',
  'values': 'bg-green-500',
  'situational': 'bg-pink-500',
};

export function AssessmentInsightsCard({ candidateId, userId }: AssessmentInsightsCardProps) {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [insights, setInsights] = useState<AggregatedInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssessmentData();
  }, [candidateId, userId]);

  const fetchAssessmentData = async () => {
    try {
      // Get user_id from candidate profile if not provided
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: profile } = await supabase
          .from('candidate_profiles')
          .select('user_id')
          .eq('id', candidateId)
          .single();
        
        targetUserId = profile?.user_id ?? undefined;
      }

      if (!targetUserId) {
        setLoading(false);
        return;
      }

      // Fetch assessment results
      const { data: assessmentData, error } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_latest', true)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const parsedResults: AssessmentResult[] = (assessmentData || []).map((r: any) => ({
        id: r.id,
        assessmentType: r.assessment_type,
        assessmentName: r.assessment_name,
        score: r.score,
        completedAt: r.completed_at,
        resultsData: r.results_data,
        isLatest: r.is_latest,
      }));

      setResults(parsedResults);

      // Calculate aggregated insights
      if (parsedResults.length > 0) {
        const totalScore = parsedResults.reduce((sum, r) => sum + (r.score || 0), 0);
        const avgScore = Math.round(totalScore / parsedResults.length);

        // Extract insights from results data
        const strengths: Set<string> = new Set();
        const developmentAreas: Set<string> = new Set();
        let personalityType: string | undefined;
        let workStyle: string | undefined;

        parsedResults.forEach(result => {
          const data = result.resultsData;
          if (!data) return;

          // Extract strengths
          if (data.strengths) {
            data.strengths.forEach((s: string) => strengths.add(s));
          }
          if (data.top_traits) {
            data.top_traits.forEach((t: string) => strengths.add(t));
          }

          // Extract development areas
          if (data.development_areas) {
            data.development_areas.forEach((a: string) => developmentAreas.add(a));
          }
          if (data.areas_for_improvement) {
            data.areas_for_improvement.forEach((a: string) => developmentAreas.add(a));
          }

          // Extract personality/work style
          if (data.personality_type && !personalityType) {
            personalityType = data.personality_type;
          }
          if (data.work_style && !workStyle) {
            workStyle = data.work_style;
          }
        });

        setInsights({
          overallScore: avgScore,
          completedAssessments: parsedResults.length,
          topStrengths: Array.from(strengths).slice(0, 4),
          developmentAreas: Array.from(developmentAreas).slice(0, 3),
          personalityType,
          workStyle,
        });
      }
    } catch (error) {
      console.error('Error fetching assessment data:', error);
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

  if (results.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No assessments completed yet</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => navigate('/assessments')}
          >
            Assign Assessment
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Assessment Insights
        </CardTitle>
        {insights && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Overall</span>
            <span className={`text-2xl font-bold ${getScoreColor(insights.overallScore)}`}>
              {insights.overallScore}%
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              Completed
            </div>
            <p className="text-2xl font-bold">{insights?.completedAssessments || 0}</p>
          </div>
          {insights?.personalityType && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Brain className="h-4 w-4" />
                Type
              </div>
              <p className="text-sm font-medium">{insights.personalityType}</p>
            </div>
          )}
        </div>

        {/* Top Strengths */}
        {insights?.topStrengths && insights.topStrengths.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Key Strengths</p>
            <div className="flex flex-wrap gap-2">
              {insights.topStrengths.map((strength, idx) => (
                <Badge key={idx} variant="secondary" className="bg-green-100 text-green-700">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {strength}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Individual Assessments */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Completed Assessments</p>
          <div className="space-y-2">
            {results.slice(0, 4).map((result) => {
              const Icon = ASSESSMENT_ICONS[result.assessmentType] || Brain;
              const colorClass = ASSESSMENT_COLORS[result.assessmentType] || 'bg-gray-500';

              return (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{result.assessmentName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(result.completedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.score !== null && (
                      <>
                        <Progress value={result.score} className="w-16 h-2" />
                        <span className={`font-bold ${getScoreColor(result.score)}`}>
                          {result.score}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* View All Button */}
        {results.length > 4 && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate(`/assessments?candidate=${candidateId}`)}
          >
            View All {results.length} Assessments
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
