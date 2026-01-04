import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, ChevronDown, ChevronUp, Activity, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { useCommandCenterData } from "@/hooks/useCommandCenterData";
import { useAnomalyAlerts } from "@/hooks/useAnomalyAlerts";
import { CommandCenterHealthPanel } from "./CommandCenterHealthPanel";
import { AnomalyAlertsPanel } from "./AnomalyAlertsPanel";
import { UnifiedTaskQueuePanel } from "./UnifiedTaskQueuePanel";
import { QuickActionsPanel } from "./QuickActionsPanel";
import { LiveActivityStream } from "./LiveActivityStream";

export function AdminCommandCenter() {
  const [isOpen, setIsOpen] = useState(true);
  const { data, isLoading, refetch } = useCommandCenterData();
  const { anomalies, isLoading: anomaliesLoading, resolveAnomaly, triggerDetection } = useAnomalyAlerts();

  const totalAlerts = (data?.anomalies.active || 0) + (data?.tasks.securityAlerts || 0);
  const status = data?.health.status || 'operational';

  const statusColors = {
    operational: 'bg-emerald-500',
    degraded: 'bg-amber-500',
    down: 'bg-rose-500',
  };

  const statusLabels = {
    operational: 'Operational',
    degraded: 'Degraded',
    down: 'Down',
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="glass-card border-primary/20 overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-3 text-base">
                <Command className="h-5 w-5 text-primary" />
                <span className="hidden sm:inline">Command Center</span>
                <span className="sm:hidden">Control</span>
                <div className="flex items-center gap-2">
                  <motion.div
                    className={cn("h-2.5 w-2.5 rounded-full", statusColors[status])}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className={cn(
                    "text-xs font-medium",
                    status === 'operational' && "text-emerald-500",
                    status === 'degraded' && "text-amber-500",
                    status === 'down' && "text-rose-500",
                  )}>
                    {statusLabels[status]}
                  </span>
                </div>
                {totalAlerts > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px] gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {totalAlerts}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-3">
                {!isOpen && (
                  <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      <span className="font-medium">{data?.health.activeUsers1h || 0}</span> active
                    </span>
                    <span className="text-muted-foreground/50">•</span>
                    <span><span className="font-medium">{data?.tasks.pendingApprovals || 0}</span> approvals</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span><span className="font-medium">{data?.anomalies.active || 0}</span> anomalies</span>
                  </div>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={isOpen ? "Collapse command center" : "Expand command center"}>
                  {isOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <AnimatePresence>
          {isOpen && (
            <CollapsibleContent forceMount>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent className="pt-0 pb-4 px-4">
                  {/* Mobile: Horizontal scrollable strip */}
                  <div className="lg:hidden overflow-x-auto pb-2 -mx-4 px-4">
                    <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                      <div className="w-[280px] shrink-0">
                        <CommandCenterHealthPanel
                          status={data?.health.status || 'operational'}
                          activeUsers={data?.health.activeUsers1h || 0}
                          errorCount={data?.health.totalErrors1h || 0}
                          criticalErrors={data?.health.criticalErrors1h || 0}
                          responseTime={data?.health.avgResponseTime || 150}
                          isLoading={isLoading}
                          onRefresh={() => refetch()}
                        />
                      </div>
                      <div className="w-[280px] shrink-0">
                        <AnomalyAlertsPanel
                          anomalies={anomalies}
                          isLoading={anomaliesLoading}
                          isDetecting={triggerDetection.isPending}
                          onResolve={(id) => resolveAnomaly.mutate({ id })}
                          onTriggerDetection={() => triggerDetection.mutate()}
                        />
                      </div>
                      <div className="w-[280px] shrink-0">
                        <UnifiedTaskQueuePanel
                          pendingApprovals={data?.tasks.pendingApprovals || 0}
                          pendingApplications={data?.tasks.pendingApplications || 0}
                          securityAlerts={data?.tasks.securityAlerts || 0}
                          overdueItems={data?.tasks.overdueItems || 0}
                          isLoading={isLoading}
                        />
                      </div>
                      <div className="w-[200px] shrink-0">
                        <QuickActionsPanel
                          onRefreshAll={() => refetch()}
                          onRunHealthCheck={() => triggerDetection.mutate()}
                          isRefreshing={isLoading}
                        />
                      </div>
                      <div className="w-[280px] shrink-0">
                        <LiveActivityStream />
                      </div>
                    </div>
                  </div>

                  {/* Desktop: Full 5-column grid */}
                  <div className="hidden lg:grid lg:grid-cols-5 gap-4">
                    <CommandCenterHealthPanel
                      status={data?.health.status || 'operational'}
                      activeUsers={data?.health.activeUsers1h || 0}
                      errorCount={data?.health.totalErrors1h || 0}
                      criticalErrors={data?.health.criticalErrors1h || 0}
                      responseTime={data?.health.avgResponseTime || 150}
                      isLoading={isLoading}
                      onRefresh={() => refetch()}
                    />
                    <AnomalyAlertsPanel
                      anomalies={anomalies}
                      isLoading={anomaliesLoading}
                      isDetecting={triggerDetection.isPending}
                      onResolve={(id) => resolveAnomaly.mutate({ id })}
                      onTriggerDetection={() => triggerDetection.mutate()}
                    />
                    <UnifiedTaskQueuePanel
                      pendingApprovals={data?.tasks.pendingApprovals || 0}
                      pendingApplications={data?.tasks.pendingApplications || 0}
                      securityAlerts={data?.tasks.securityAlerts || 0}
                      overdueItems={data?.tasks.overdueItems || 0}
                      isLoading={isLoading}
                    />
                    <QuickActionsPanel
                      onRefreshAll={() => refetch()}
                      onRunHealthCheck={() => triggerDetection.mutate()}
                      isRefreshing={isLoading}
                    />
                    <LiveActivityStream />
                  </div>
                </CardContent>
              </motion.div>
            </CollapsibleContent>
          )}
        </AnimatePresence>
      </Card>
    </Collapsible>
  );
}
