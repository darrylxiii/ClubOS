import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  Download,
  RefreshCw,
  Award
} from 'lucide-react';
import { format } from 'date-fns';

interface AssessmentResult {
  id: string;
  assessment_id: string;
  assessment_name: string;
  assessment_type: string;
  score: number | null;
  completed_at: string;
  attempt_number: number;
  time_spent_seconds: number | null;
  is_latest: boolean;
  results_data: any;
}

interface AssessmentDetailModalProps {
  open: boolean;
  onClose: () => void;
  result: AssessmentResult;
  allowRetake?: boolean;
}

export const AssessmentDetailModal = memo(({ 
  open, 
  onClose, 
  result,
  allowRetake = false 
}: AssessmentDetailModalProps) => {
  const handleRetake = () => {
    const routes: Record<string, string> = {
      'swipe-game': '/swipe-game',
      'miljoenenjacht': '/miljoenenjacht',
      'pressure-cooker': '/pressure-cooker',
      'blind-spot-detector': '/blind-spot-detector',
      'values-poker': '/values-poker',
      'incubator-20': '/assessments/incubator-20',
    };
    window.location.href = routes[result.assessment_id] || '/assessments';
  };

  const handleDownload = () => {
    const dataStr = JSON.stringify(result.results_data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.assessment_id}-${result.attempt_number}-results.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{result.assessment_name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{result.assessment_type}</Badge>
                <Badge variant="secondary">Attempt #{result.attempt_number}</Badge>
                {result.is_latest && <Badge>Latest</Badge>}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {allowRetake && (
                <Button size="sm" onClick={handleRetake}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-200px)]">
          <div className="space-y-6 pr-4">
            {/* Overview Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <Calendar className="w-6 h-6 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">Completed</p>
                    <p className="text-sm font-semibold mt-1">
                      {format(new Date(result.completed_at), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(result.completed_at), 'h:mm a')}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {result.time_spent_seconds && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <Clock className="w-6 h-6 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Time Spent</p>
                      <p className="text-sm font-semibold mt-1">
                        {formatTime(result.time_spent_seconds)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {result.score !== null && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <Award className="w-6 h-6 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="text-2xl font-bold mt-1">{result.score}%</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Score Progress */}
            {result.score !== null && (
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Overall Performance</span>
                    <span className="text-muted-foreground">{result.score}%</span>
                  </div>
                  <Progress value={result.score} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {result.score >= 80 
                      ? 'Excellent performance! You demonstrated strong capabilities.'
                      : result.score >= 60
                      ? 'Good performance. There are opportunities for growth.'
                      : 'Consider retaking this assessment to improve your results.'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Results Data Visualization */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Detailed Results</h3>
                
                {/* Render specific result types based on assessment */}
                {result.assessment_id === 'swipe-game' && result.results_data?.archetype && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Your Archetype</p>
                      <p className="text-lg font-bold mt-1">{result.results_data.archetype}</p>
                    </div>
                    {result.results_data.topStrengths && (
                      <div>
                        <p className="text-sm font-medium mb-2">Top Strengths:</p>
                        <ul className="space-y-1">
                          {result.results_data.topStrengths.map((strength: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground flex items-start">
                              <TrendingUp className="w-4 h-4 mr-2 mt-0.5 text-green-500" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {result.assessment_id === 'miljoenenjacht' && result.results_data?.profile && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Risk Tolerance</p>
                        <p className="text-lg font-bold">{Math.round(result.results_data.profile.riskTolerance * 10)}/10</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Decision Quality</p>
                        <p className="text-lg font-bold">{Math.round(result.results_data.profile.decisionQuality * 10)}/10</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Emotional Regulation</p>
                        <p className="text-lg font-bold">{Math.round(result.results_data.profile.emotionalRegulation * 10)}/10</p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Pressure Performance</p>
                        <p className="text-lg font-bold">{Math.round(result.results_data.profile.pressurePerformance * 10)}/10</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generic fallback for other assessments */}
                {!['swipe-game', 'miljoenenjacht'].includes(result.assessment_id) && (
                  <div className="space-y-2">
                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                      {JSON.stringify(result.results_data, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

AssessmentDetailModal.displayName = 'AssessmentDetailModal';
