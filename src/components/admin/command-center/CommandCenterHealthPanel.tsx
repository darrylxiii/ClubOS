import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, AlertTriangle, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface HealthPanelProps {
  status: 'operational' | 'degraded' | 'down';
  activeUsers: number;
  errorCount: number;
  criticalErrors: number;
  responseTime: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export function CommandCenterHealthPanel({
  status,
  activeUsers,
  errorCount,
  criticalErrors,
  responseTime,
  isLoading,
  onRefresh,
}: HealthPanelProps) {
  const statusConfig = {
    operational: {
      label: 'Operational',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    degraded: {
      label: 'Degraded',
      color: 'bg-amber-500',
      textColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    down: {
      label: 'Down',
      color: 'bg-rose-500',
      textColor: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
    },
  };

  const config = statusConfig[status];

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 text-primary" />
            System Health
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Indicator */}
        <div className={cn("flex items-center justify-between p-3 rounded-lg", config.bgColor)}>
          <div className="flex items-center gap-2">
            <motion.div
              className={cn("h-2.5 w-2.5 rounded-full", config.color)}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className={cn("text-sm font-medium", config.textColor)}>
              {config.label}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">Platform</span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="h-3 w-3 text-blue-500" />
              <span className="text-[10px] text-muted-foreground">Active (1h)</span>
            </div>
            <div className="text-lg font-bold">{activeUsers}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3 w-3 text-amber-500" />
              <span className="text-[10px] text-muted-foreground">Latency</span>
            </div>
            <div className="text-lg font-bold">
              {responseTime}
              <span className="text-xs font-normal text-muted-foreground">ms</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3 w-3 text-orange-500" />
              <span className="text-[10px] text-muted-foreground">Errors (1h)</span>
            </div>
            <div className={cn("text-lg font-bold", errorCount > 10 && "text-orange-500")}>
              {errorCount}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3 w-3 text-rose-500" />
              <span className="text-[10px] text-muted-foreground">Critical</span>
            </div>
            <div className={cn("text-lg font-bold", criticalErrors > 0 && "text-rose-500")}>
              {criticalErrors}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
