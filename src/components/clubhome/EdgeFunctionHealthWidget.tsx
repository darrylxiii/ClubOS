import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Server, ArrowRight, AlertTriangle, CheckCircle, XCircle, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { useEdgeFunctionHealth } from "@/hooks/useEdgeFunctionHealth";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export const EdgeFunctionHealthWidget = () => {
  const { data: health, isLoading } = useEdgeFunctionHealth();

  if (isLoading) {
    return (
      <Card className="glass-card h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Healthy' },
    degraded: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Degraded' },
    critical: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Critical' },
  };

  const status = statusConfig[health?.overallStatus || 'healthy'];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="glass-card h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-premium" />
              <span>Backend Health</span>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/admin/audit-log">
                Logs
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 space-y-4">
          {/* Status Badge */}
          <div className={`flex items-center gap-2 p-3 rounded-lg ${status.bg}`}>
            <StatusIcon className={`h-5 w-5 ${status.color}`} />
            <div>
              <p className={`font-semibold ${status.color}`}>{status.label}</p>
              <p className="text-xs text-muted-foreground">
                {health?.overallSuccessRate || 100}% success rate
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Invocations (1h)</p>
              <p className="font-semibold">{health?.totalInvocations || 0}</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Avg Response</p>
              <p className="font-semibold">{health?.avgResponseTime || 0}ms</p>
            </div>
          </div>

          {/* Errors */}
          {health && health.totalErrors > 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="text-xs text-muted-foreground">Errors (1h)</span>
              <Badge variant="destructive">{health.totalErrors}</Badge>
            </div>
          )}

          {/* Top Functions */}
          {health?.functions && health.functions.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Top Functions
              </p>
              <div className="space-y-1">
                {health.functions.slice(0, 3).map((fn) => (
                  <div key={fn.name} className="flex items-center justify-between text-xs">
                    <span className="truncate font-mono">{fn.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={fn.successRate >= 95 ? 'text-green-500' : fn.successRate >= 80 ? 'text-yellow-500' : 'text-red-500'}>
                        {fn.successRate}%
                      </span>
                      <span className="text-muted-foreground">{fn.invocations}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critical Functions Alert */}
          {health?.criticalFunctions && health.criticalFunctions.length > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-xs">
                <span className="font-medium">{health.criticalFunctions.length}</span> functions need attention
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
