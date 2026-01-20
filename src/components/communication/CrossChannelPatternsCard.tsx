import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  TrendingUp, 
  Target, 
  MessageSquare, 
  RefreshCw,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useCrossChannelPatterns } from '@/hooks/useCrossChannelPatterns';
import { motion, AnimatePresence } from 'framer-motion';

interface CrossChannelPatternsCardProps {
  entityType?: string;
  entityId?: string;
  compact?: boolean;
}

const patternConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  going_cold: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  highly_engaged: { icon: TrendingUp, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  ready_to_convert: { icon: Target, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  channel_preference: { icon: MessageSquare, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  needs_escalation: { icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
};

export function CrossChannelPatternsCard({ entityType, entityId, compact = false }: CrossChannelPatternsCardProps) {
  const { 
    activeAlerts, 
    loading, 
    analyzePatterns, 
    resolvePattern,
    getHighPriorityAlerts 
  } = useCrossChannelPatterns(entityType, entityId);

  const highPriority = getHighPriorityAlerts();
  const displayPatterns = compact ? highPriority.slice(0, 3) : activeAlerts;

  const handleAnalyze = async () => {
    await analyzePatterns(entityType, entityId);
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Cross-Channel Patterns
          {highPriority.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {highPriority.length} Priority
            </Badge>
          )}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAnalyze}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && displayPatterns.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayPatterns.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>No active patterns detected</p>
            <p className="text-sm">Communication is healthy</p>
          </div>
        ) : (
          <AnimatePresence>
            {displayPatterns.map((pattern, index) => {
              const config = patternConfig[pattern.pattern_type || ''] || patternConfig.going_cold;
              const Icon = config.icon;

              return (
                <motion.div
                  key={pattern.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg ${config.bgColor} border border-border/30`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${config.bgColor}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm capitalize">
                          {pattern.pattern_type?.replace(/_/g, ' ')}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round((pattern.confidence || 0) * 100)}% confident
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {(pattern.details as Record<string, unknown>)?.description as string || pattern.pattern_type?.replace(/_/g, ' ')}
                      </p>
                      {!compact && (pattern.details as Record<string, unknown>)?.recommended_action && (
                        <p className="text-xs text-primary mt-1">
                          → {(pattern.details as Record<string, unknown>)?.recommended_action as string}
                        </p>
                      )}
                    </div>
                    {!compact && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resolvePattern(pattern.id)}
                        className="shrink-0"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {compact && activeAlerts.length > 3 && (
          <Button variant="link" className="w-full text-sm">
            View all {activeAlerts.length} patterns
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
