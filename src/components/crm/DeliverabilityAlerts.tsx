import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertTriangle, AlertCircle, CheckCircle, TrendingDown,
  Mail, Shield, RefreshCw, X, ChevronRight, Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DeliverabilityAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  metric: string;
  value: number;
  threshold: number;
  action: string;
  account_email?: string;
}

export function DeliverabilityAlerts() {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Fetch account health data
  const { data: healthData = [], isLoading, refetch } = useQuery({
    queryKey: ['deliverability-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instantly_account_health')
        .select('*')
        .order('health_score', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Generate alerts from health data
  const alerts: DeliverabilityAlert[] = [];
  
  healthData.forEach((account: any) => {
    const email = account.email || account.account_email;
    
    // Critical: Very low health score
    if (account.health_score < 50) {
      alerts.push({
        id: `health-${account.id}`,
        type: 'critical',
        title: 'Critical Account Health',
        description: `${email} has a critically low health score of ${account.health_score}%. Immediate action required.`,
        metric: 'Health Score',
        value: account.health_score,
        threshold: 50,
        action: 'Pause campaigns and warm up account',
        account_email: email,
      });
    }
    
    // Warning: Low health score
    else if (account.health_score < 70) {
      alerts.push({
        id: `health-warn-${account.id}`,
        type: 'warning',
        title: 'Low Account Health',
        description: `${email} health score is ${account.health_score}%. Consider reducing send volume.`,
        metric: 'Health Score',
        value: account.health_score,
        threshold: 70,
        action: 'Reduce daily send limit by 30%',
        account_email: email,
      });
    }

    // Critical: High spam rate
    if (account.spam_rate > 5) {
      alerts.push({
        id: `spam-${account.id}`,
        type: 'critical',
        title: 'High Spam Rate',
        description: `${email} has a ${account.spam_rate}% spam rate. Stop sending immediately.`,
        metric: 'Spam Rate',
        value: account.spam_rate,
        threshold: 5,
        action: 'Pause all campaigns, review content',
        account_email: email,
      });
    }

    // Warning: Elevated bounce rate
    if (account.bounce_rate > 3) {
      alerts.push({
        id: `bounce-${account.id}`,
        type: 'warning',
        title: 'Elevated Bounce Rate',
        description: `${email} has a ${account.bounce_rate}% bounce rate. Verify your email list quality.`,
        metric: 'Bounce Rate',
        value: account.bounce_rate,
        threshold: 3,
        action: 'Run email verification on remaining leads',
        account_email: email,
      });
    }

    // Warning: Connection issue
    if (account.connection_status === 'error' || account.connection_status === 'disconnected') {
      alerts.push({
        id: `connection-${account.id}`,
        type: 'critical',
        title: 'Account Disconnected',
        description: `${email} is disconnected. Reconnect to resume sending.`,
        metric: 'Connection',
        value: 0,
        threshold: 1,
        action: 'Reconnect account in Instantly',
        account_email: email,
      });
    }
  });

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));
  const criticalCount = visibleAlerts.filter(a => a.type === 'critical').length;
  const warningCount = visibleAlerts.filter(a => a.type === 'warning').length;

  const dismissAlert = (id: string) => {
    setDismissedAlerts(prev => new Set([...prev, id]));
  };

  const getAlertIcon = (type: DeliverabilityAlert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <CheckCircle className="h-5 w-5 text-primary" />;
    }
  };

  const getAlertBorder = (type: DeliverabilityAlert['type']) => {
    switch (type) {
      case 'critical':
        return 'border-l-4 border-l-destructive bg-destructive/5';
      case 'warning':
        return 'border-l-4 border-l-amber-500 bg-amber-500/5';
      case 'info':
        return 'border-l-4 border-l-primary bg-primary/5';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="border-b border-border/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/5">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Deliverability Alerts</CardTitle>
              <p className="text-xs text-muted-foreground">
                {criticalCount > 0 && <span className="text-destructive">{criticalCount} critical</span>}
                {criticalCount > 0 && warningCount > 0 && ' • '}
                {warningCount > 0 && <span className="text-amber-500">{warningCount} warnings</span>}
                {criticalCount === 0 && warningCount === 0 && 'All systems healthy'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : visibleAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="font-medium text-lg mb-1">All Clear</h3>
            <p className="text-sm text-muted-foreground">
              No deliverability issues detected. Keep up the good work!
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {visibleAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`p-4 rounded-lg ${getAlertBorder(alert.type)}`}
              >
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <Badge 
                        variant={alert.type === 'critical' ? 'destructive' : 'outline'}
                        className="text-[10px] px-1.5"
                      >
                        {alert.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {alert.description}
                    </p>
                    
                    {/* Progress indicator */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-muted-foreground">{alert.metric}:</span>
                      <Progress 
                        value={Math.min(100, (alert.value / alert.threshold) * 100)} 
                        className="flex-1 h-1.5"
                      />
                      <span className="text-xs font-medium">
                        {alert.value}%
                      </span>
                    </div>

                    {/* Recommended action */}
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <ChevronRight className="h-3 w-3" />
                      <span>{alert.action}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mt-1 -mr-1"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Quick Stats */}
        {healthData.length > 0 && (
          <div className="pt-3 border-t border-border/20">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">
                  {healthData.filter((a: any) => a.health_score >= 80).length}
                </p>
                <p className="text-xs text-muted-foreground">Healthy</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-500">
                  {healthData.filter((a: any) => a.health_score >= 50 && a.health_score < 80).length}
                </p>
                <p className="text-xs text-muted-foreground">At Risk</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">
                  {healthData.filter((a: any) => a.health_score < 50).length}
                </p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
