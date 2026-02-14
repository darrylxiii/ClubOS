import { useFinancialAlerts, RenewalAlert } from '@/hooks/useRenewalAlerts';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, TrendingDown, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap = {
  renewal: Calendar,
  budget: TrendingDown,
  underutilized: Bell,
};

const severityStyles = {
  critical: 'border-destructive/50 bg-destructive/5',
  warning: 'border-warning/50 bg-warning/5',
  info: 'border-muted-foreground/30',
};

export function FinancialAlertsBanner() {
  const alerts = useFinancialAlerts();

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.slice(0, 5).map((alert) => {
        const Icon = iconMap[alert.type] || AlertTriangle;
        return (
          <Alert
            key={alert.id}
            className={cn('flex items-start gap-3', severityStyles[alert.severity])}
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <AlertTitle className="text-sm font-medium flex items-center gap-2">
                {alert.title}
                <Badge
                  variant={
                    alert.severity === 'critical'
                      ? 'destructive'
                      : alert.severity === 'warning'
                      ? 'secondary'
                      : 'outline'
                  }
                  className="text-[10px] px-1.5 py-0"
                >
                  {alert.severity}
                </Badge>
              </AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                {alert.description}
              </AlertDescription>
            </div>
          </Alert>
        );
      })}
      {alerts.length > 5 && (
        <p className="text-xs text-muted-foreground text-center">
          +{alerts.length - 5} more alerts
        </p>
      )}
    </div>
  );
}

export default FinancialAlertsBanner;
