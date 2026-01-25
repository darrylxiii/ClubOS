import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  ShieldAlert,
  TrendingUp,
  Clock,
  Calendar,
  Phone,
  Users,
  Bot
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NoShowPrediction } from '@/hooks/useNoShowPrediction';

interface NoShowRiskBadgeProps {
  prediction: NoShowPrediction | null | undefined;
  showScore?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const riskConfig = {
  low: {
    icon: CheckCircle,
    label: 'Low Risk',
    variant: 'default' as const,
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20',
  },
  medium: {
    icon: AlertCircle,
    label: 'Medium Risk',
    variant: 'secondary' as const,
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20',
  },
  high: {
    icon: AlertTriangle,
    label: 'High Risk',
    variant: 'destructive' as const,
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20',
  },
  critical: {
    icon: ShieldAlert,
    label: 'Critical Risk',
    variant: 'destructive' as const,
    className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
  },
};

const factorLabels: Record<string, { icon: typeof TrendingUp; label: string }> = {
  domainHistory: { icon: TrendingUp, label: 'Domain History' },
  leadTime: { icon: Clock, label: 'Lead Time' },
  timeOfDay: { icon: Clock, label: 'Time of Day' },
  dayOfWeek: { icon: Calendar, label: 'Day of Week' },
  guestCount: { icon: Users, label: 'Guest Count' },
  hasPhone: { icon: Phone, label: 'Phone Provided' },
  recaptchaScore: { icon: Bot, label: 'Bot Detection' },
};

export function NoShowRiskBadge({
  prediction,
  showScore = true,
  showTooltip = true,
  size = 'md',
  className,
}: NoShowRiskBadgeProps) {
  if (!prediction) return null;

  const config = riskConfig[prediction.risk_level];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-2.5 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'font-medium flex items-center gap-1.5 border',
        config.className,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showScore && (
        <span>{prediction.risk_score}%</span>
      )}
      {!showScore && (
        <span>{config.label}</span>
      )}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium">{config.label}</span>
              <span className="text-lg font-bold">{prediction.risk_score}%</span>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1.5 pt-1 border-t">
              <p className="font-medium text-foreground">Risk Factors:</p>
              {Object.entries(prediction.prediction_factors)
                .filter(([key]) => key in factorLabels)
                .map(([key, value]) => {
                  const factor = factorLabels[key as keyof typeof factorLabels];
                  const FactorIcon = factor.icon;
                  const numValue = typeof value === 'number' ? value : 0;
                  const isHighRisk = numValue >= 50;
                  
                  return (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <FactorIcon className="h-3 w-3" />
                        <span>{factor.label}</span>
                      </div>
                      <span className={cn(
                        'font-medium',
                        isHighRisk ? 'text-destructive' : 'text-emerald-600'
                      )}>
                        {numValue.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
            </div>

            {prediction.intervention_triggered && (
              <div className="pt-1 border-t">
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Intervention triggered
                </p>
              </div>
            )}

            {prediction.prediction_factors.domain && (
              <div className="pt-1 border-t text-xs text-muted-foreground">
                <p>Domain: {prediction.prediction_factors.domain}</p>
                {prediction.prediction_factors.domainNoShowRate !== null && (
                  <p>Domain no-show rate: {(prediction.prediction_factors.domainNoShowRate * 100).toFixed(1)}%</p>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
