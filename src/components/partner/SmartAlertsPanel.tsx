import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, Clock, Target, X, ExternalLink, Bell, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface SmartAlert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action_required: string;
  action_url: string;
  metadata: any;
  created_at: string;
}

export function SmartAlertsPanel({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['smart-alerts', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partner_smart_alerts' as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as unknown as SmartAlert[];
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    staleTime: 30000,
  });

  const dismissAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('partner_smart_alerts' as any)
        .update({ is_dismissed: true })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-alerts', companyId] });
    }
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning': return <Clock className="h-5 w-5 text-amber-500" />;
      case 'success': return <TrendingUp className="h-5 w-5 text-emerald-500" />;
      default: return <Target className="h-5 w-5 text-primary" />;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical': 
        return 'border-destructive/40 bg-destructive/5 dark:bg-destructive/10';
      case 'warning': 
        return 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10';
      case 'success': 
        return 'border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10';
      default: 
        return 'border-primary/40 bg-primary/5 dark:bg-primary/10';
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Smart Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            Smart Alerts
          </div>
          {alerts && alerts.length > 0 && (
            <Badge variant="secondary">
              {alerts.length} Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!alerts || alerts.length === 0 ? (
          <div className="flex items-center gap-4 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
            <div className="p-2 rounded-full bg-emerald-500/10">
              <Sparkles className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">All Clear</p>
              <p className="text-sm text-muted-foreground">No urgent actions required. Your hiring is on track.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {alerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Alert className={`${getSeverityStyles(alert.severity)} transition-all hover:shadow-md`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5">
                          {getSeverityIcon(alert.severity)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <AlertTitle className="flex items-center gap-2 flex-wrap text-sm">
                            {alert.title}
                            <Badge variant="outline" className="text-xs capitalize">
                              {alert.alert_type.replace(/_/g, ' ')}
                            </Badge>
                          </AlertTitle>
                          <AlertDescription className="text-sm text-muted-foreground">
                            {alert.message}
                          </AlertDescription>
                          {alert.action_required && (
                            <div className="pt-2">
                              <Button 
                                size="sm" 
                                variant="default" 
                                asChild
                              >
                                <Link to={alert.action_url}>
                                  {alert.action_required}
                                  <ExternalLink className="ml-2 h-3 w-3" />
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
                        onClick={() => dismissAlert.mutate(alert.id)}
                        disabled={dismissAlert.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Alert>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
