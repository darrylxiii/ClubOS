import { memo, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Target, 
  Heart, 
  Zap, 
  TrendingUp, 
  Clock, 
  Award,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { AssessmentDetailModal } from './AssessmentDetailModal';
import { useNavigate } from 'react-router-dom';

interface AssessmentResult {
  id: string;
  assessment_id: string;
  assessment_name: string;
  assessment_type: 'personality' | 'skills' | 'culture' | 'technical' | 'strategic';
  score: number | null;
  completed_at: string;
  attempt_number: number;
  time_spent_seconds: number | null;
  is_latest: boolean;
  results_data: any;
}

interface AssessmentHistoryProps {
  userId?: string;
  viewMode: 'candidate' | 'admin' | 'partner';
}

const ASSESSMENT_ICONS = {
  personality: Brain,
  skills: Target,
  culture: Heart,
  technical: Zap,
  strategic: Award,
};

const ASSESSMENT_COLORS = {
  personality: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  skills: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  culture: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
  technical: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  strategic: 'bg-green-500/10 text-green-700 dark:text-green-300',
};

export const AssessmentHistory = memo(({ userId, viewMode }: AssessmentHistoryProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<AssessmentResult | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!targetUserId) return;
    fetchResults();
  }, [targetUserId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assessment_results')
        .select('*')
        .eq('user_id', targetUserId)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      
      // Cast and map the database results to our interface
      const mappedResults: AssessmentResult[] = (data || []).map((item: any) => ({
        id: item.id,
        assessment_id: item.assessment_id,
        assessment_name: item.assessment_name,
        assessment_type: item.assessment_type as 'personality' | 'skills' | 'culture' | 'technical' | 'strategic',
        score: item.score,
        completed_at: item.completed_at,
        attempt_number: item.attempt_number ?? 1,
        time_spent_seconds: item.time_spent_seconds ?? null,
        is_latest: item.is_latest ?? true,
        results_data: item.results_data,
      }));
      
      setResults(mappedResults);
    } catch (error) {
      console.error('Error fetching assessment results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (result: AssessmentResult) => {
    setSelectedResult(result);
    setShowDetailModal(true);
  };

  const handleRetake = (assessmentId: string) => {
    // Navigate to assessment based on ID
    const routes: Record<string, string> = {
      'swipe-game': '/swipe-game',
      'miljoenenjacht': '/miljoenenjacht',
      'pressure-cooker': '/pressure-cooker',
      'blind-spot-detector': '/blind-spot-detector',
      'values-poker': '/values-poker',
      'incubator-20': '/assessments/incubator-20',
    };
    navigate(routes[assessmentId] || '/assessments');
  };

  const calculateStats = () => {
    const uniqueAssessments = new Set(results.map(r => r.assessment_id)).size;
    const totalAttempts = results.length;
    const avgScore = results.filter(r => r.score !== null).reduce((sum, r) => sum + (r.score || 0), 0) / results.filter(r => r.score !== null).length || 0;
    const latestDate = results.length > 0 ? results[0].completed_at : null;

    return { uniqueAssessments, totalAttempts, avgScore, latestDate };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Brain className="w-16 h-16 text-muted-foreground/50" />
          <div className="text-center">
            <p className="text-lg font-semibold">No assessments completed yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {viewMode === 'candidate' 
                ? 'Start your journey by taking your first assessment'
                : 'This user has not completed any assessments'}
            </p>
          </div>
          {viewMode === 'candidate' && (
            <Button onClick={() => navigate('/assessments')}>
              Browse Assessments
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Group results by assessment ID
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.assessment_id]) {
      acc[result.assessment_id] = [];
    }
    acc[result.assessment_id].push(result);
    return acc;
  }, {} as Record<string, AssessmentResult[]>);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assessments Taken</p>
                <p className="text-2xl font-bold mt-1">{stats.uniqueAssessments}</p>
              </div>
              <Award className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
                <p className="text-2xl font-bold mt-1">{stats.totalAttempts}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-2xl font-bold mt-1">{Math.round(stats.avgScore)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Assessment</p>
                <p className="text-sm font-semibold mt-1">
                  {stats.latestDate ? format(new Date(stats.latestDate), 'MMM d, yyyy') : 'N/A'}
                </p>
              </div>
              <Clock className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment History</CardTitle>
          <CardDescription>
            Your assessment journey and progress over time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(groupedResults).map(([assessmentId, assessmentResults]) => {
            const latestResult = assessmentResults.find(r => r.is_latest) || assessmentResults[0];
            const Icon = ASSESSMENT_ICONS[latestResult.assessment_type] || Brain;
            const colorClass = ASSESSMENT_COLORS[latestResult.assessment_type];

            return (
              <div
                key={assessmentId}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-3 rounded-lg ${colorClass}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{latestResult.assessment_name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {latestResult.assessment_type}
                        </Badge>
                        {assessmentResults.length > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            Attempt {latestResult.attempt_number}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(latestResult.completed_at), 'MMM d, yyyy')}
                        </div>
                        {latestResult.time_spent_seconds && (
                          <div className="flex items-center gap-1">
                            <Zap className="w-4 h-4" />
                            {Math.floor(latestResult.time_spent_seconds / 60)}m
                          </div>
                        )}
                      </div>

                      {latestResult.score !== null && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Score</span>
                            <span className="font-semibold">{latestResult.score}%</span>
                          </div>
                          <Progress value={latestResult.score} className="h-2" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(latestResult)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    {viewMode === 'candidate' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRetake(assessmentId)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retake
                      </Button>
                    )}
                  </div>
                </div>

                {/* Show attempt history if multiple attempts */}
                {assessmentResults.length > 1 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Previous attempts:</p>
                    <div className="flex gap-2 flex-wrap">
                      {assessmentResults.slice(1).map((result, idx) => (
                        <Button
                          key={result.id}
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleViewDetails(result)}
                        >
                          #{result.attempt_number} - {result.score}%
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedResult && (
        <AssessmentDetailModal
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          result={selectedResult}
          allowRetake={viewMode === 'candidate'}
        />
      )}
    </div>
  );
});

AssessmentHistory.displayName = 'AssessmentHistory';
