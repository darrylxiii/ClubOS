import { BarChart3, MessageSquare, Clock, TrendingUp, Mail, Phone, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface Props {
  stats: {
    totalMessages: number;
    avgResponseTime: number;
    channelBreakdown: Record<string, number>;
    lastContactDate: string | null;
  };
}

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: MessageSquare,
  email: Mail,
  phone: Phone,
  meeting: Video
};

const channelColors: Record<string, string> = {
  whatsapp: 'bg-green-500',
  email: 'bg-blue-500',
  phone: 'bg-orange-500',
  meeting: 'bg-purple-500'
};

export function CommunicationStatsCard({ stats }: Props) {
  const total = Object.values(stats.channelBreakdown).reduce((a, b) => a + b, 0) || 1;
  
  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-primary" />
          Communication Overview
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <MessageSquare className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats.totalMessages}</p>
            <p className="text-xs text-muted-foreground">Total Messages</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats.avgResponseTime}h</p>
            <p className="text-xs text-muted-foreground">Avg Response</p>
          </div>
        </div>

        {/* Channel Breakdown */}
        <div className="space-y-3">
          <p className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            By Channel
          </p>
          
          {Object.entries(stats.channelBreakdown).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No channel data yet
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.channelBreakdown).map(([channel, count]) => {
                const Icon = channelIcons[channel] || MessageSquare;
                const percentage = Math.round((count / total) * 100);
                const color = channelColors[channel] || 'bg-primary';
                
                return (
                  <div key={channel} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 capitalize">
                        <Icon className="h-4 w-4" />
                        {channel}
                      </span>
                      <span className="text-muted-foreground">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Tips */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs font-medium text-primary mb-1">💡 Quick Tip</p>
          <p className="text-xs text-muted-foreground">
            Candidates who respond within 4 hours are 3x more likely to get interview invitations
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
