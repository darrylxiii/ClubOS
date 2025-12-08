import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, Clock, MessageSquare, TrendingUp, 
  AlertTriangle, Zap, BarChart3
} from 'lucide-react';

interface SpeakingMetrics {
  totalDurationSeconds: number;
  speakingTime: Record<string, number>;
  interruptionCount: Record<string, number>;
  averageResponseTimeMs: Record<string, number>;
  questionsAsked: Record<string, number>;
  talkRatio: Record<string, number>;
  longestMonologue: { speaker: string; durationSeconds: number };
  silencePercentage: number;
}

interface SpeakingMetricsPanelProps {
  metrics: SpeakingMetrics | null;
  participants: Array<{ id: string; name: string; role?: string }>;
}

export function SpeakingMetricsPanel({ metrics, participants }: SpeakingMetricsPanelProps) {
  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Speaking metrics not available yet
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getParticipantName = (id: string): string => {
    const participant = participants.find(p => p.id === id);
    return participant?.name || id;
  };

  const getParticipantRole = (id: string): string | undefined => {
    return participants.find(p => p.id === id)?.role;
  };

  // Sort speakers by talk time
  const sortedSpeakers = Object.entries(metrics.speakingTime)
    .sort(([, a], [, b]) => b - a);

  const totalTalkTime = Object.values(metrics.speakingTime).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Duration</span>
            </div>
            <p className="text-2xl font-bold">
              {formatDuration(metrics.totalDurationSeconds)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Mic className="h-4 w-4" />
              <span className="text-xs">Active Speaking</span>
            </div>
            <p className="text-2xl font-bold">
              {Math.round((1 - metrics.silencePercentage / 100) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs">Questions Asked</span>
            </div>
            <p className="text-2xl font-bold">
              {Object.values(metrics.questionsAsked).reduce((a, b) => a + b, 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Interruptions</span>
            </div>
            <p className="text-2xl font-bold">
              {Object.values(metrics.interruptionCount).reduce((a, b) => a + b, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Talk Time Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Talk Time Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedSpeakers.map(([speakerId, seconds]) => {
            const percentage = (seconds / totalTalkTime) * 100;
            const role = getParticipantRole(speakerId);
            const isCandidate = role === 'candidate';
            const isInterviewer = role === 'interviewer' || role === 'host';

            // Ideal: Interviewer 30-40%, Candidate 60-70%
            const idealMin = isInterviewer ? 30 : 55;
            const idealMax = isInterviewer ? 45 : 75;
            const isIdeal = percentage >= idealMin && percentage <= idealMax;
            const isTooMuch = percentage > idealMax;
            const isTooLittle = percentage < idealMin;

            return (
              <div key={speakerId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getParticipantName(speakerId)}</span>
                    {role && (
                      <Badge variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(seconds)}
                    </span>
                    <Badge 
                      variant={isIdeal ? 'default' : isTooMuch ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {Math.round(percentage)}%
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={percentage} 
                  className={`h-2 ${isIdeal ? '[&>div]:bg-green-500' : isTooMuch ? '[&>div]:bg-red-500' : '[&>div]:bg-yellow-500'}`}
                />
                {!isIdeal && (
                  <p className="text-xs text-muted-foreground">
                    {isTooMuch 
                      ? `Speaking more than ideal (${idealMin}-${idealMax}%)` 
                      : `Could speak more (ideal: ${idealMin}-${idealMax}%)`}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Individual Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Engagement Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedSpeakers.map(([speakerId]) => (
              <div key={speakerId} className="border rounded-lg p-3">
                <p className="font-medium mb-3">{getParticipantName(speakerId)}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Questions</p>
                    <p className="font-semibold">{metrics.questionsAsked[speakerId] || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Interruptions</p>
                    <p className="font-semibold">{metrics.interruptionCount[speakerId] || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Avg Response</p>
                    <p className="font-semibold">
                      {metrics.averageResponseTimeMs[speakerId] 
                        ? `${Math.round(metrics.averageResponseTimeMs[speakerId] / 1000)}s`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Longest Monologue Alert */}
      {metrics.longestMonologue.durationSeconds > 120 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Long Monologue Detected</p>
                <p className="text-sm text-muted-foreground">
                  {getParticipantName(metrics.longestMonologue.speaker)} spoke for{' '}
                  {formatDuration(metrics.longestMonologue.durationSeconds)} uninterrupted.
                  {metrics.longestMonologue.durationSeconds > 180 && (
                    <span className="text-yellow-600"> Consider more interactive dialogue.</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
