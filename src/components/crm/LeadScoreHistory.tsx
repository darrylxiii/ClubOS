import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, History, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface ScoreChange {
  id: string;
  timestamp: string;
  previousScore: number;
  newScore: number;
  reason: string;
  triggeredBy: string;
}

interface LeadScoreHistoryProps {
  prospectId: string;
  prospectName?: string;
}

export function LeadScoreHistory({ prospectId, prospectName }: LeadScoreHistoryProps) {
  // Mock data - in production, fetch from database
  const [scoreHistory] = useState<ScoreChange[]>([
    {
      id: '1',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      previousScore: 45,
      newScore: 60,
      reason: 'Email opened 3 times',
      triggeredBy: 'engagement_rule'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      previousScore: 30,
      newScore: 45,
      reason: 'Replied to outreach email',
      triggeredBy: 'reply_rule'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      previousScore: 20,
      newScore: 30,
      reason: 'Company size matched (1000+)',
      triggeredBy: 'company_fit_rule'
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      previousScore: 0,
      newScore: 20,
      reason: 'Initial score - VP title detected',
      triggeredBy: 'role_seniority_rule'
    },
  ]);

  const getScoreChangeIcon = (prev: number, next: number) => {
    if (next > prev) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (next < prev) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getScoreChangeColor = (prev: number, next: number) => {
    if (next > prev) return 'text-green-500';
    if (next < prev) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const currentScore = scoreHistory[0]?.newScore || 0;

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Score History
            {prospectName && (
              <span className="text-muted-foreground font-normal">• {prospectName}</span>
            )}
          </div>
          <Badge 
            variant="outline" 
            className={`text-lg ${currentScore >= 60 ? 'border-green-500 text-green-500' : currentScore >= 40 ? 'border-yellow-500 text-yellow-500' : 'border-muted-foreground'}`}
          >
            Current: {currentScore}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {scoreHistory.map((change, index) => (
              <motion.div
                key={change.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-10"
              >
                {/* Timeline dot */}
                <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                  {getScoreChangeIcon(change.previousScore, change.newScore)}
                </div>

                <div className="p-3 rounded-lg bg-background/50 border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{change.previousScore}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className={`font-semibold ${getScoreChangeColor(change.previousScore, change.newScore)}`}>
                        {change.newScore}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {change.newScore > change.previousScore ? '+' : ''}{change.newScore - change.previousScore}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(change.timestamp), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm">{change.reason}</p>
                  <Badge variant="outline" className="text-xs mt-2">
                    {change.triggeredBy.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
