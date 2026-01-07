import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency, type StageBreakdown } from '@/hooks/useEmployeePipelineValue';

interface EarningsFunnelVisualizationProps {
  stageBreakdown: StageBreakdown[];
  isLoading?: boolean;
}

const stageColors = [
  'bg-blue-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-green-500',
];

export function EarningsFunnelVisualization({ stageBreakdown, isLoading }: EarningsFunnelVisualizationProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {[100, 80, 60, 40, 30].map((w, i) => (
              <div key={i} className="h-10 bg-muted rounded" style={{ width: `${w}%` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...stageBreakdown.map(s => s.count), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <TrendingDown className="h-4 w-4" />
          Pipeline Funnel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {stageBreakdown.map((stage, idx) => {
          const widthPercent = Math.max((stage.count / maxCount) * 100, 10);
          
          return (
            <motion.div
              key={stage.stage}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="relative"
            >
              <div
                className={`${stageColors[idx]} h-12 rounded-lg flex items-center justify-between px-4 text-white transition-all`}
                style={{ width: `${widthPercent}%` }}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{stage.stage_name}</span>
                  <span className="text-white/80 text-sm">({stage.count})</span>
                </div>
                {stage.count > 0 && (
                  <span className="font-semibold text-sm">
                    {formatCurrency(stage.weighted_value)}
                  </span>
                )}
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pr-2">
                {Math.round(stage.probability * 100)}%
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
