import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Command, ChevronDown, ChevronUp, Activity } from "lucide-react";
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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="glass-card border-primary/20 overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Command className="h-5 w-5 text-primary" />
                Command Center
                <motion.div
                  className={cn("h-2 w-2 rounded-full", statusColors[status])}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {totalAlerts > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                    {totalAlerts} alerts
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {!isOpen && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {data?.health.activeUsers1h || 0} active
                    </span>
                    <span>|</span>
                    <span>{data?.tasks.pendingApprovals || 0} approvals</span>
                    <span>|</span>
                    <span>{data?.anomalies.active || 0} anomalies</span>
                  </div>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
                <CardContent className="pt-0 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    {/* Health Panel */}
                    <CommandCenterHealthPanel
                      status={data?.health.status || 'operational'}
                      activeUsers={data?.health.activeUsers1h || 0}
                      errorCount={data?.health.totalErrors1h || 0}
                      criticalErrors={data?.health.criticalErrors1h || 0}
                      responseTime={data?.health.avgResponseTime || 150}
                      isLoading={isLoading}
                      onRefresh={() => refetch()}
                    />

                    {/* Anomaly Alerts */}
                    <AnomalyAlertsPanel
                      anomalies={anomalies}
                      isLoading={anomaliesLoading}
                      isDetecting={triggerDetection.isPending}
                      onResolve={(id) => resolveAnomaly.mutate({ id })}
                      onTriggerDetection={() => triggerDetection.mutate()}
                    />

                    {/* Task Queue */}
                    <UnifiedTaskQueuePanel
                      pendingApprovals={data?.tasks.pendingApprovals || 0}
                      pendingApplications={data?.tasks.pendingApplications || 0}
                      securityAlerts={data?.tasks.securityAlerts || 0}
                      overdueItems={data?.tasks.overdueItems || 0}
                      isLoading={isLoading}
                    />

                    {/* Quick Actions */}
                    <QuickActionsPanel
                      onRefreshAll={() => refetch()}
                      onRunHealthCheck={() => triggerDetection.mutate()}
                      isRefreshing={isLoading}
                    />

                    {/* Live Activity */}
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
