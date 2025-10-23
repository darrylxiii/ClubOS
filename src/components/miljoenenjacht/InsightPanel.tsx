import { memo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface InsightPanelProps {
  currentRound: number;
  avgDecisionTime: number;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
  recentBehavior: string;
}

export const InsightPanel = memo(({ currentRound, avgDecisionTime, riskTrend, recentBehavior }: InsightPanelProps) => {
  const insights = [];

  if (avgDecisionTime > 15000) {
    insights.push({
      icon: Brain,
      text: "Analytical approach detected",
      color: "text-blue-500"
    });
  } else if (avgDecisionTime < 5000) {
    insights.push({
      icon: AlertCircle,
      text: "Quick decisions - intuitive style",
      color: "text-purple-500"
    });
  }

  if (riskTrend === 'increasing') {
    insights.push({
      icon: TrendingUp,
      text: "Risk tolerance rising",
      color: "text-green-500"
    });
  } else if (riskTrend === 'decreasing') {
    insights.push({
      icon: TrendingDown,
      text: "Getting more cautious",
      color: "text-orange-500"
    });
  }

  if (currentRound < 3) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Live Insights</span>
          </div>
          <div className="space-y-2">
            {insights.map((insight, i) => {
              const Icon = insight.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-2 text-sm"
                >
                  <Icon className={`w-3 h-3 ${insight.color}`} />
                  <span className="text-muted-foreground">{insight.text}</span>
                </motion.div>
              );
            })}
            {recentBehavior && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-muted-foreground pt-2 border-t border-border/30"
              >
                {recentBehavior}
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

InsightPanel.displayName = 'InsightPanel';
