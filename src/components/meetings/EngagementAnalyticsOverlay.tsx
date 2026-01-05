import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Activity, Mic, MicOff, TrendingUp, TrendingDown, 
  Clock, Users, X, Maximize2, Minimize2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ParticipantMetrics {
  id: string;
  name: string;
  role: 'host' | 'candidate' | 'interviewer' | 'participant';
  speakingTimeMs: number;
  speakingPercentage: number;
  isSpeaking: boolean;
  engagement: number; // 0-100
  sentimentTrend: 'positive' | 'neutral' | 'negative';
}

interface EngagementAnalyticsOverlayProps {
  meetingId: string;
  participants: ParticipantMetrics[];
  elapsedTimeMs: number;
  onClose?: () => void;
}

export function EngagementAnalyticsOverlay({
  meetingId,
  participants,
  elapsedTimeMs,
  onClose
}: EngagementAnalyticsOverlayProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-500 bg-green-500';
    if (score >= 60) return 'text-blue-500 bg-blue-500';
    if (score >= 40) return 'text-amber-500 bg-amber-500';
    return 'text-rose-500 bg-rose-500';
  };

  const getSentimentIcon = (trend: ParticipantMetrics['sentimentTrend']) => {
    switch (trend) {
      case 'positive':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'negative':
        return <TrendingDown className="h-3 w-3 text-rose-500" />;
      default:
        return <Activity className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const averageEngagement = participants.length > 0
    ? Math.round(participants.reduce((acc, p) => acc + p.engagement, 0) / participants.length)
    : 0;

  const activeSpeaker = participants.find(p => p.isSpeaking);

  if (!expanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Card className="border-primary/20 bg-background/95 backdrop-blur shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {/* Engagement Score */}
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  getEngagementColor(averageEngagement).split(' ')[1] + '/20'
                )}>
                  <span className={cn('text-sm font-bold', getEngagementColor(averageEngagement).split(' ')[0])}>
                    {averageEngagement}
                  </span>
                </div>
              </div>

              {/* Active Speaker */}
              <div className="flex items-center gap-2 min-w-[120px]">
                {activeSpeaker ? (
                  <>
                    <Mic className="h-4 w-4 text-green-500 animate-pulse" />
                    <span className="text-sm font-medium truncate max-w-[100px]">
                      {activeSpeaker.name}
                    </span>
                  </>
                ) : (
                  <>
                    <MicOff className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">No one speaking</span>
                  </>
                )}
              </div>

              {/* Time */}
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(elapsedTimeMs)}
              </Badge>

              {/* Expand Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setExpanded(true)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed bottom-4 right-4 z-50 w-80"
    >
      <Card className="border-primary/20 bg-background/95 backdrop-blur shadow-xl">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Engagement Analytics</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setExpanded(false)}
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={onClose}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className={cn('text-lg font-bold', getEngagementColor(averageEngagement).split(' ')[0])}>
                {averageEngagement}%
              </div>
              <div className="text-xs text-muted-foreground">Engagement</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-bold">{participants.length}</div>
              <div className="text-xs text-muted-foreground">Participants</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-bold">{formatTime(elapsedTimeMs)}</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
          </div>

          {/* Participant Breakdown */}
          <div className="space-y-3">
            {participants.map((participant) => (
              <div key={participant.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {participant.isSpeaking ? (
                      <Mic className="h-3 w-3 text-green-500 animate-pulse" />
                    ) : (
                      <MicOff className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {participant.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {participant.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSentimentIcon(participant.sentimentTrend)}
                    <span className={cn(
                      'text-xs font-medium',
                      getEngagementColor(participant.engagement).split(' ')[0]
                    )}>
                      {participant.engagement}%
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Progress 
                    value={participant.speakingPercentage} 
                    className="h-1 flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {participant.speakingPercentage}%
                  </span>
                </div>
                
                {showDetails && (
                  <div className="text-xs text-muted-foreground pl-5">
                    Speaking time: {formatDuration(participant.speakingTimeMs)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Toggle Details */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 h-7 text-xs"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
