import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

interface AlertPanelProps {
  alerts: DashboardAlert[];
}

export const AlertPanel = ({ alerts }: AlertPanelProps) => {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map(alert => {
        const Icon = alert.type === 'info' ? Info : AlertTriangle;
        const borderColor = 
          alert.type === 'critical' ? 'border-destructive/50' :
          alert.type === 'warning' ? 'border-orange-500/50' :
          'border-blue-500/50';

        return (
          <Alert 
            key={alert.id}
            variant={alert.type === 'critical' ? 'destructive' : 'default'}
            className={cn(borderColor, "transition-all duration-300")}
          >
            <Icon className="h-4 w-4" />
            <AlertTitle>{alert.title}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-4">
              <span className="flex-1">{alert.message}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {alert.actionLabel && alert.onAction && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={alert.onAction}
                    className="h-8"
                  >
                    {alert.actionLabel}
                  </Button>
                )}
                {alert.onDismiss && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={alert.onDismiss}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
};
