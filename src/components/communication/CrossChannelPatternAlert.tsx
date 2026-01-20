import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, TrendingUp, Clock, Heart, Zap, X, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type CrossChannelPattern = Database['public']['Tables']['cross_channel_patterns']['Row'];

interface CrossChannelPatternAlertProps {
  pattern: CrossChannelPattern;
  entityName?: string;
  onResolve?: () => void;
  onTakeAction?: (action: string) => void;
}

const patternConfig: Record<string, {
  icon: typeof AlertTriangle;
  color: string;
  bg: string;
  label: string;
  description: string;
}> = {
  going_cold: {
    icon: TrendingDown,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    label: 'Going Cold',
    description: 'No response across any channel recently'
  },
  highly_engaged: {
    icon: TrendingUp,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    label: 'Highly Engaged',
    description: 'Strong engagement and quick responses'
  },
  channel_preference: {
    icon: Heart,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    label: 'Channel Preference',
    description: 'Shows preference for a specific channel'
  },
  sentiment_shift: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    label: 'Sentiment Shift',
    description: 'Sentiment has changed significantly'
  },
  ready_to_convert: {
    icon: Zap,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    label: 'Ready to Convert',
    description: 'Strong buying signals detected'
  },
  needs_escalation: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    label: 'Needs Escalation',
    description: 'Requires senior team member attention'
  },
  objection_raising: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    label: 'Raising Objections',
    description: 'Multiple concerns expressed'
  }
};

export function CrossChannelPatternAlert({
  pattern,
  entityName,
  onResolve,
  onTakeAction
}: CrossChannelPatternAlertProps) {
  const config = patternConfig[pattern.pattern_type || ''] || {
    icon: AlertTriangle,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    label: pattern.pattern_type || 'Unknown',
    description: 'Pattern detected'
  };

  const Icon = config.icon;
  const confidence = Math.round((pattern.confidence || 0) * 100);
  const recommendedActions = (pattern as any).recommended_actions as string[] | null;

  const isResolved = !pattern.is_active;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className={cn(
        "overflow-hidden transition-all",
        !isResolved && "border-l-4",
        !isResolved && config.color.replace('text-', 'border-'),
        isResolved && "opacity-60"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg flex-shrink-0", config.bg)}>
              <Icon className={cn("h-5 w-5", config.color)} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{config.label}</h4>
                    {isResolved && (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    )}
                  </div>
                  {entityName && (
                    <p className="text-xs text-muted-foreground">{entityName}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {confidence}% confidence
                  </Badge>
                  {!isResolved && onResolve && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={onResolve}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-1">
                {config.description}
              </p>

              {/* Pattern Details */}
              {pattern.details && (
                <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                  {typeof pattern.details === 'object' && (
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(pattern.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Recommended Actions */}
              {!isResolved && recommendedActions && recommendedActions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {recommendedActions.map((action, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => onTakeAction?.(action)}
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  Detected {new Date(pattern.detected_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
