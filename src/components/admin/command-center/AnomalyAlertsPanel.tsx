import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Check, Loader2, Play, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AnomalyAlert } from "@/hooks/useAnomalyAlerts";

interface AnomalyAlertsPanelProps {
  anomalies: AnomalyAlert[];
  isLoading?: boolean;
  isDetecting?: boolean;
  onResolve: (id: string) => void;
  onTriggerDetection: () => void;
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    badge: 'bg-rose-500 text-white',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500 text-white',
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500 text-white',
  },
  low: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500 text-white',
  },
};

const typeLabels: Record<string, string> = {
  frustration_spike: 'Frustration Spike',
  login_drop: 'Login Drop',
  application_abandonment: 'App Abandonment',
  performance_issue: 'Performance Issue',
};

export function AnomalyAlertsPanel({
  anomalies,
  isLoading,
  isDetecting,
  onResolve,
  onTriggerDetection,
}: AnomalyAlertsPanelProps) {
  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-primary" />
            AI Anomaly Detection
            {anomalies.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                {anomalies.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={onTriggerDetection}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Scan
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : anomalies.length === 0 ? (
          <div className="text-center py-6">
            <Check className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm text-muted-foreground">No active anomalies</p>
            <p className="text-xs text-muted-foreground mt-1">System operating normally</p>
          </div>
        ) : (
          <ScrollArea className="h-[180px] -mx-2 px-2">
            <div className="space-y-2">
              {anomalies.map((anomaly) => {
                const config = severityConfig[anomaly.severity];
                const Icon = config.icon;
                
                return (
                  <div
                    key={anomaly.id}
                    className={cn(
                      "p-2.5 rounded-lg border",
                      config.bg,
                      config.border
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium">
                              {typeLabels[anomaly.anomaly_type] || anomaly.anomaly_type}
                            </span>
                            <Badge className={cn("h-4 px-1 text-[9px]", config.badge)}>
                              {anomaly.severity}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                            {anomaly.detection_data?.description || `${anomaly.affected_users} users affected`}
                          </p>
                          <p className="text-[9px] text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(anomaly.detected_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => onResolve(anomaly.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
