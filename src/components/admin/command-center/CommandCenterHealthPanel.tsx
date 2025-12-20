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
    <Card className="glass-card h-full flex flex-col">
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 text-primary" />
            Health
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 px-3 pb-3">
        {/* Status Indicator - Compact */}
        <div className={cn("flex items-center gap-2 p-2.5 rounded-lg", config.bgColor)}>
          <motion.div
            className={cn("h-3 w-3 rounded-full shrink-0", config.color)}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className={cn("text-sm font-semibold", config.textColor)}>
            {config.label}
          </span>
        </div>

        {/* Metrics - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <Users className="h-3 w-3 text-blue-500" />
              <span className="text-[10px]">Active</span>
            </div>
            <div className="text-base font-bold">{activeUsers}</div>
          </div>

          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <Zap className="h-3 w-3 text-amber-500" />
              <span className="text-[10px]">Latency</span>
            </div>
            <div className="text-base font-bold">
              {responseTime}<span className="text-xs font-normal ml-0.5">ms</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <AlertTriangle className="h-3 w-3 text-orange-500" />
              <span className="text-[10px]">Errors</span>
            </div>
            <div className={cn("text-base font-bold", errorCount > 10 && "text-orange-500")}>
              {errorCount}
            </div>
          </div>

          <div className="p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
              <AlertTriangle className="h-3 w-3 text-rose-500" />
              <span className="text-[10px]">Critical</span>
            </div>
            <div className={cn("text-base font-bold", criticalErrors > 0 && "text-rose-500")}>
              {criticalErrors}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
