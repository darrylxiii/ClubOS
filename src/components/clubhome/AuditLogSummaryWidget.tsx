import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, AlertTriangle, Activity, Eye, ArrowRight, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface AuditEvent {
  id: string;
  event_type: string;
  action: string;
  actor_email: string | null;
  created_at: string;
  result: string | null;
}

const SENSITIVE_ACTIONS = [
  'delete',
  'admin',
  'permission',
  'role_change',
  'password',
  'login_failed',
  'export',
  'bulk',
];

export const AuditLogSummaryWidget = () => {
  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit-log-summary'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get today's events
      const { data: events, error } = await supabase
        .from('audit_events')
        .select('id, event_type, action, actor_email, created_at, result')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      // Get recent 5 for display
      const { data: recentEvents, error: recentError } = await supabase
        .from('audit_events')
        .select('id, event_type, action, actor_email, created_at, result')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (recentError) throw recentError;
      
      // Count sensitive actions
      const sensitiveCount = events?.filter(e => 
        SENSITIVE_ACTIONS.some(s => 
          e.action?.toLowerCase().includes(s) || 
          e.event_type?.toLowerCase().includes(s)
        )
      ).length || 0;
      
      // Count failed actions
      const failedCount = events?.filter(e => 
        e.result === 'failed' || e.result === 'error'
      ).length || 0;
      
      return {
        todayCount: events?.length || 0,
        sensitiveCount,
        failedCount,
        recentEvents: recentEvents || [],
        hasUnusualActivity: sensitiveCount > 10 || failedCount > 5,
      };
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const getActionIcon = (action: string, eventType: string) => {
    const combined = `${action} ${eventType}`.toLowerCase();
    if (SENSITIVE_ACTIONS.some(s => combined.includes(s))) {
      return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    }
    return <Activity className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Audit Log
            </CardTitle>
            {auditData?.hasUnusualActivity && (
              <span className="flex items-center gap-1 text-xs text-amber-500">
                <AlertTriangle className="h-3 w-3" />
                Review
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <Eye className="h-4 w-4 mx-auto text-blue-500 mb-1" />
              <div className="text-lg font-bold">{auditData?.todayCount || 0}</div>
              <div className="text-[10px] text-muted-foreground">Today</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 mx-auto text-amber-500 mb-1" />
              <div className="text-lg font-bold">{auditData?.sensitiveCount || 0}</div>
              <div className="text-[10px] text-muted-foreground">Sensitive</div>
            </div>
            <div className={`text-center p-2 rounded-lg ${
              (auditData?.failedCount || 0) > 0 ? 'bg-rose-500/10' : 'bg-muted/50'
            }`}>
              <Activity className={`h-4 w-4 mx-auto mb-1 ${
                (auditData?.failedCount || 0) > 0 ? 'text-rose-500' : 'text-muted-foreground'
              }`} />
              <div className={`text-lg font-bold ${
                (auditData?.failedCount || 0) > 0 ? 'text-rose-500' : ''
              }`}>
                {auditData?.failedCount || 0}
              </div>
              <div className="text-[10px] text-muted-foreground">Failed</div>
            </div>
          </div>

          {/* Recent Events */}
          {auditData?.recentEvents && auditData.recentEvents.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Recent Activity</div>
              {auditData.recentEvents.slice(0, 4).map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getActionIcon(event.action, event.event_type)}
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">
                        {event.action}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {event.actor_email || 'System'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(event.created_at ?? new Date()), { addSuffix: false })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No audit events today
            </div>
          )}

          {/* Action */}
          <Button variant="glass" size="sm" className="w-full" asChild>
            <Link to="/admin/audit-log">
              View Full Log
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
