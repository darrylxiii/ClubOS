import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeadlineAlert } from "@/hooks/usePartnerContracts";
import { AlertTriangle, Clock, X, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContractDeadlineAlertsProps {
  alerts: DeadlineAlert[];
  onDismiss?: (alertId: string) => void;
  className?: string;
}

export function ContractDeadlineAlerts({ 
  alerts, 
  onDismiss,
  className 
}: ContractDeadlineAlertsProps) {
  const breachedAlerts = alerts.filter(a => a.alert_type === 'breached');
  const approachingAlerts = alerts.filter(a => a.alert_type === 'approaching');

  if (alerts.length === 0) return null;

  return (
    <Card className={cn(
      "border-2",
      breachedAlerts.length > 0 
        ? "border-destructive/50 bg-destructive/5" 
        : "border-yellow-500/50 bg-yellow-500/5",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            breachedAlerts.length > 0 
              ? "bg-destructive/10" 
              : "bg-yellow-500/10"
          )}>
            {breachedAlerts.length > 0 ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Bell className="h-5 w-5 text-yellow-600" />
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className={cn(
                "font-semibold",
                breachedAlerts.length > 0 ? "text-destructive" : "text-yellow-700 dark:text-yellow-500"
              )}>
                {breachedAlerts.length > 0 
                  ? `${breachedAlerts.length} Deadline${breachedAlerts.length > 1 ? 's' : ''} Breached`
                  : `${approachingAlerts.length} Deadline${approachingAlerts.length > 1 ? 's' : ''} Approaching`
                }
              </h3>
              {onDismiss && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => alerts.forEach(a => onDismiss(a.id))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {breachedAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Badge variant="destructive" className="text-xs">
                    BREACHED
                  </Badge>
                  <span className="text-destructive">
                    Milestone deadline has passed
                  </span>
                  {onDismiss && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-5 px-2 text-xs ml-auto"
                      onClick={() => onDismiss(alert.id)}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              ))}

              {approachingAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-700 dark:text-yellow-500">
                    Milestone deadline approaching
                  </span>
                  {onDismiss && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-5 px-2 text-xs ml-auto"
                      onClick={() => onDismiss(alert.id)}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
